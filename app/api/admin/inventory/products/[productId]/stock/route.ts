import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const stockQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  movementType: z.enum(['PURCHASE_IN', 'SALE_OUT', 'RETURN', 'ADJUSTMENT']).optional(),
});

// GET /api/admin/inventory/products/[productId]/stock - Get stock movement history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId as string;
    const { productId } = await params;

    // Verify product belongs to admin
    const product = await prisma.product.findFirst({
      where: { id: productId, adminId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      movementType: searchParams.get('movementType') || undefined,
    };

    const queryValidation = stockQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { page, limit, movementType } = queryValidation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Build where clause
      const where: any = { productId };
      if (movementType) {
        where.movementType = movementType;
      }

      // Get total count
      const total = await db.stockMovement.count({ where });

      // Get movements with pagination
      const movements = await db.stockMovement.findMany({
        where,
        orderBy: { movedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Get all movements for summary calculation
      const allMovements = await db.stockMovement.findMany({
        where: { productId },
      });

      // Calculate totals
      const totalIn = allMovements
        .filter((m) => m.movementType === 'PURCHASE_IN' || m.movementType === 'RETURN')
        .reduce((sum, m) => sum + m.qty, 0);

      const totalOut = allMovements
        .filter((m) => m.movementType === 'SALE_OUT')
        .reduce((sum, m) => sum + m.qty, 0);

      // Format movements with display info
      const formattedMovements = movements.map((m) => {
        let displayType: string;
        let qtyDisplay: string;
        let color: string;

        switch (m.movementType) {
          case 'PURCHASE_IN':
            displayType = 'Purchase In';
            qtyDisplay = `+${m.qty}`;
            color = 'green';
            break;
          case 'SALE_OUT':
            displayType = 'Sale Out';
            qtyDisplay = `-${m.qty}`;
            color = 'red';
            break;
          case 'RETURN':
            displayType = 'Return';
            qtyDisplay = `+${m.qty}`;
            color = 'yellow';
            break;
          case 'ADJUSTMENT':
            displayType = 'Adjustment';
            qtyDisplay = m.qty > 0 ? `+${m.qty}` : `${m.qty}`;
            color = m.qty > 0 ? 'green' : 'red';
            break;
        }

        return {
          id: m.id,
          movementType: m.movementType,
          displayType,
          qty: m.qty,
          qtyDisplay,
          color,
          notes: m.notes,
          referenceId: m.referenceId,
          movedAt: m.movedAt,
        };
      });

      return {
        movements: formattedMovements,
        summary: {
          totalIn,
          totalOut,
          currentStock: product.stockQty,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching stock movements', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}
