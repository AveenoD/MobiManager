import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { stockAdjustmentSchema } from '@/lib/validations/inventory.schema';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

// POST /api/admin/inventory/products/[productId]/stock/adjust - Manual stock adjustment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return jsonCors(
        request,
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return jsonCors(
        request,
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { productId } = await params;
    const body = await request.json();

    // Validate input
    const validation = stockAdjustmentSchema.safeParse(body);

    if (!validation.success) {
      return jsonCors(
        request,
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { movementType, qty, notes } = validation.data;

    if (validation.data.productId !== productId) {
      return jsonCors(request, { success: false, error: 'Product ID mismatch' }, { status: 400 });
    }

    // Get product and verify ownership
    const product = await withAdminContext(adminId, async (db) => {
      return db.item.findFirst({
        where: { id: productId, adminId },
      });
    });

    if (!product) {
      return jsonCors(
        request,
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const oldStock = product.stockQty;

    // Calculate new stock
    let newStock: number;

    if (movementType === 'PURCHASE_IN' || movementType === 'RETURN') {
      newStock = oldStock + qty;
    } else {
      // ADJUSTMENT - can be positive or negative
      newStock = oldStock + qty;

      // Check if adjustment would make stock negative
      if (newStock < 0) {
        return jsonCors(
          request,
          {
            success: false,
            error: 'Stock cannot go below 0',
            currentStock: oldStock,
            attemptedAdjustment: qty,
          },
          { status: 400 }
        );
      }
    }

    // Update stock with audit log if needed
    const result = await withAdminContext(adminId, async (db) => {
      // Get admin info for audit log
      const admin = await db.admin.findUnique({
        where: { id: adminId },
        select: { ownerName: true },
      });

      // Create stock movement
      await db.stockMovement.create({
        data: {
          adminId,
          productId,
          movementType,
          qty,
          notes,
          movedAt: new Date(),
        },
      });

      // Create audit log for ADJUSTMENT type
      if (movementType === 'ADJUSTMENT') {
        await db.auditLog.create({
          data: {
            adminId,
            tableName: 'Product',
            recordId: productId,
            fieldName: 'stockQty',
            oldValue: String(oldStock),
            newValue: String(newStock),
            reason: notes,
            editedByType: 'ADMIN',
            editedById: adminId,
            editedByName: admin?.ownerName || 'Unknown',
          },
        });
      }

      // Update product stock
      const updatedProduct = await db.item.update({
        where: { id: productId },
        data: { stockQty: newStock },
      });

      return updatedProduct;
    });

    logger.info('Stock adjusted', {
      adminId,
      productId,
      movementType,
      oldStock,
      newStock,
      qty,
    });

    return jsonCors(request, {
      success: true,
      message: 'Stock adjusted successfully',
      product: {
        id: result.id,
        name: result.name,
        oldStock,
        newStock,
        movementType,
        qty,
      },
    });
  } catch (error) {
    logger.error('Error adjusting stock', { error });
    return jsonCors(
      request,
      { success: false, error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}
