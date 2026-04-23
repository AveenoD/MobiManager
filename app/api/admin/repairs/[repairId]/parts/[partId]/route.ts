import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type RouteParams = { params: Promise<{ repairId: string; partId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { adminId: string };
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      payload = result.payload as { adminId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { adminId } = payload;
    const { repairId, partId } = await params;

    const result = await withAdminContext(adminId, async (prisma) => {
      // Verify part belongs to this repair
      const part = await prisma.repairPartUsed.findFirst({
        where: { id: partId, repairId },
        include: { repair: true },
      });

      if (!part) {
        return { error: 'Part not found', status: 404 };
      }

      // Verify repair ownership
      if (part.repair.adminId !== adminId) {
        return { error: 'Unauthorized', status: 403 };
      }

      // Verify repair is not DELIVERED or CANCELLED
      if (part.repair.status === 'DELIVERED' || part.repair.status === 'CANCELLED') {
        return { error: 'Cannot remove parts from a delivered or cancelled repair', status: 400 };
      }

      // If part has productId, restore stock
      if (part.productId) {
        await prisma.product.update({
          where: { id: part.productId },
          data: { stockQty: { increment: part.qty } },
        });

        // Create RETURN StockMovement
        await prisma.stockMovement.create({
          data: {
            productId: part.productId,
            adminId,
            movementType: 'RETURN',
            qty: part.qty,
            referenceId: repairId,
          },
        });
      }

      // Delete the part
      await prisma.repairPartUsed.delete({
        where: { id: partId },
      });

      // Recalculate repairCost (subtract removed part's cost)
      const remainingParts = await prisma.repairPartUsed.findMany({
        where: { repairId },
      });

      const totalPartsCost = remainingParts.reduce((sum, p) => {
        return sum + Number(p.cost) * p.qty;
      }, 0);

      await prisma.repair.update({
        where: { id: repairId },
        data: { repairCost: new Decimal(totalPartsCost) },
      });

      logger.info('Part removed from repair', { adminId, repairId, partId, partName: part.partName, qty: part.qty });

      return { success: true };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ message: 'Part removed successfully' });
  } catch (error) {
    logger.error('Error removing part from repair', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}