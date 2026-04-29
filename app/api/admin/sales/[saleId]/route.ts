import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { saleCancelSchema } from '@/lib/validations/sales.schema';

// GET /api/admin/sales/[saleId] - Get sale detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { saleId } = await params;

    const result = await withAdminContext(adminId, async (db) => {
      const sale = await db.sale.findFirst({
        where: { id: saleId, adminId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brandName: true,
                  category: true,
                },
              },
            },
          },
          shop: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!sale) {
        return { error: 'Sale not found', status: 404 };
      }

      // Calculate profit for each item
      let totalProfit = 0;
      const itemsWithProfit = sale.items.map((item: any) => {
        const itemProfit = (Number(item.unitPrice) - Number(item.purchasePriceAtSale)) * item.qty;
        totalProfit += itemProfit;
        return {
          productId: item.productId,
          productName: item.product.name,
          brandName: item.product.brandName,
          category: item.product.category,
          qty: item.qty,
          unitPrice: Number(item.unitPrice),
          purchasePriceAtSale: Number(item.purchasePriceAtSale),
          subtotal: Number(item.subtotal),
          itemProfit,
        };
      });

      totalProfit -= Number(sale.discountAmount);
      totalProfit = Math.round(totalProfit);

      // Get creator info
      let createdByName = 'Unknown';
      if (sale.createdByType === 'ADMIN') {
        const admin = await db.admin.findUnique({
          where: { id: sale.createdById },
          select: { ownerName: true },
        });
        createdByName = admin?.ownerName || 'Admin';
      } else if (sale.createdByType === 'SUB_ADMIN') {
        const subAdmin = await db.subAdmin.findUnique({
          where: { id: sale.createdById },
          select: { name: true },
        });
        createdByName = subAdmin?.name || 'Sub Admin';
      }

      return {
        sale: {
          id: sale.id,
          saleNumber: sale.saleNumber,
          saleDate: sale.saleDate,
          customerName: sale.customerName,
          customerPhone: sale.customerPhone,
          totalAmount: Number(sale.totalAmount),
          discountAmount: Number(sale.discountAmount),
          paymentMode: sale.paymentMode,
          status: sale.status,
          amountReceived: Number(sale.amountReceived),
          pendingAmount: Number(sale.pendingAmount),
          notes: sale.notes,
          createdAt: sale.createdAt,
        },
        items: itemsWithProfit,
        totalProfit,
        createdByType: sale.createdByType,
        createdByName,
        shopName: sale.shop.name,
      };
    });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status as 400 | 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching sale detail', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sale detail' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sales/[saleId] - Cancel sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { saleId } = await params;
    const body = await request.json();

    // Validate cancellation reason
    const validation = saleCancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { reason } = validation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Get sale
      const sale = await db.sale.findFirst({
        where: { id: saleId, adminId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!sale) {
        return { error: 'Sale not found', status: 404 };
      }

      if (sale.status === 'CANCELLED') {
        return { error: 'Sale is already cancelled', status: 400 };
      }

      // Check 24 hour limit
      const hoursSinceCreation = (Date.now() - sale.createdAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > 24) {
        return {
          error: 'Cannot cancel sale older than 24 hours',
          suggestion: 'Contact support for older corrections',
          status: 400,
        };
      }

      // Get admin info for audit log
      const admin = await db.admin.findUnique({
        where: { id: adminId },
        select: { ownerName: true },
      });

      const editedByName = admin?.ownerName || 'Unknown';

      // Cancel sale and restore stock
      // Mark sale as cancelled
      await db.sale.update({
        where: { id: saleId },
        data: { status: 'CANCELLED' },
      });

      // Restore stock for each item and create RETURN movements
      for (const item of sale.items) {
        // Restore stock
        await db.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.qty } },
        });

        // Create RETURN stock movement
        await db.stockMovement.create({
          data: {
            adminId,
            productId: item.productId,
            movementType: 'RETURN',
            qty: item.qty,
            referenceId: saleId,
            notes: `Sale cancelled: ${reason}`,
            movedAt: new Date(),
          },
        });
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          adminId,
          tableName: 'Sale',
          recordId: saleId,
          fieldName: 'status',
          oldValue: 'ACTIVE',
          newValue: 'CANCELLED',
          reason,
          editedByType: 'ADMIN',
          editedById: adminId,
          editedByName,
        },
      });

      return { success: true, saleNumber: sale.saleNumber };
    });

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error, suggestion: result.suggestion },
        { status: result.status as 400 | 404 }
      );
    }

    logger.warn('Sale cancelled', {
      adminId,
      saleId,
      reason,
      totalAmount: result.saleNumber,
    });

    return NextResponse.json({
      success: true,
      message: `Sale #${result.saleNumber} has been cancelled`,
    });
  } catch (error) {
    logger.error('Error cancelling sale', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to cancel sale' },
      { status: 500 }
    );
  }
}
