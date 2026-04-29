import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { addPartSchema } from '@/lib/validations/repair.schema';
import { Decimal } from '@prisma/client/runtime/library';

type RouteParams = { params: Promise<{ repairId: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { adminId: string };
    try {
      const result = await jwtVerify(token);
      payload = result.payload as { adminId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { adminId } = payload;
    const { repairId } = await params;

    const body = await req.json();
    const parsed = addPartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { partName, qty, cost, productId } = parsed.data;

    const result = await withAdminContext(adminId, async (prisma) => {
      // Get repair and verify ownership
      const repair = await prisma.repair.findFirst({
        where: { id: repairId, adminId },
      });

      if (!repair) {
        return { error: 'Repair not found', status: 404 };
      }

      if (repair.status === 'DELIVERED' || repair.status === 'CANCELLED') {
        return { error: 'Cannot add parts to a delivered or cancelled repair', status: 400 };
      }

      let finalCost = cost;

      if (productId) {
        // Verify product belongs to this admin
        const product = await prisma.product.findFirst({
          where: { id: productId, adminId },
        });

        if (!product) {
          return { error: 'Product not found', status: 404 };
        }

        // Check stock
        if (product.stockQty < qty) {
          return { error: `Insufficient stock. Available: ${product.stockQty}`, status: 400 };
        }

        // Deduct stock
        await prisma.product.update({
          where: { id: productId },
          data: { stockQty: { decrement: qty } },
        });

        // Create SALE_OUT StockMovement
        await prisma.stockMovement.create({
          data: {
            productId,
            adminId,
            movementType: 'SALE_OUT',
            qty,
            referenceId: repairId,
          },
        });

        // Use product purchasePrice as default cost if not provided
        if (cost === undefined || cost === 0) {
          finalCost = Number(product.purchasePrice);
        }

        // Create RepairPartUsed record with product
        const part = await prisma.repairPartUsed.create({
          data: {
            repairId,
            productId,
            partName,
            qty,
            cost: finalCost,
          },
        });

        // Recalculate repairCost
        const allParts = await prisma.repairPartUsed.findMany({
          where: { repairId },
        });

        const totalPartsCost = allParts.reduce((sum, p) => {
          return sum + Number(p.cost) * p.qty;
        }, 0);

        await prisma.repair.update({
          where: { id: repairId },
          data: { repairCost: new Decimal(totalPartsCost) },
        });

        logger.info('Part added to repair', { adminId, repairId, partName, qty, cost: finalCost });

        const updatedParts = await prisma.repairPartUsed.findMany({
          where: { repairId },
          include: { product: true },
        });

        return { part, updatedParts };
      } else {
        // Create RepairPartUsed record without product
        const part = await prisma.repairPartUsed.create({
          data: {
            repairId,
            partName,
            qty,
            cost: finalCost ?? new Decimal(0),
          },
        });

        // Recalculate repairCost
        const allParts = await prisma.repairPartUsed.findMany({
          where: { repairId },
        });

        const totalPartsCost = allParts.reduce((sum, p) => {
          return sum + Number(p.cost) * p.qty;
        }, 0);

        await prisma.repair.update({
          where: { id: repairId },
          data: { repairCost: new Decimal(totalPartsCost) },
        });

        logger.info('Part added to repair', { adminId, repairId, partName, qty, cost: finalCost });

        const updatedParts = await prisma.repairPartUsed.findMany({
          where: { repairId },
          include: { product: true },
        });

        return { part, updatedParts };
      }
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ part: result.part, parts: result.updatedParts }, { status: 201 });
  } catch (error) {
    logger.error('Error adding part to repair', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const token = req.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: { adminId: string };
    try {
      const result = await jwtVerify(token);
      payload = result.payload as { adminId: string };
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { adminId } = payload;
    const { repairId } = await params;

    const repair = await withAdminContext(adminId, async (prisma) => {
      return prisma.repair.findFirst({
        where: { id: repairId, adminId },
      });
    });

    if (!repair) {
      return NextResponse.json({ error: 'Repair not found' }, { status: 404 });
    }

    const parts = await withAdminContext(adminId, async (prisma) => {
      return prisma.repairPartUsed.findMany({
        where: { repairId },
        include: { product: true },
      });
    });

    return NextResponse.json({ parts });
  } catch (error) {
    logger.error('Error fetching repair parts', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}