import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { updateProductSchema } from '@/lib/validations/inventory.schema';

// Helper to verify product ownership
async function verifyProductOwnership(adminId: string, productId: string) {
  const product = await withAdminContext(adminId, async (db) => {
    return db.product.findFirst({
      where: { id: productId, adminId },
    });
  });
  return product;
}

// GET /api/admin/inventory/products/[productId] - Get product detail
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

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { productId } = await params;

    const product = await verifyProductOwnership(adminId, productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get detailed info with stock movements
    const result = await withAdminContext(adminId, async (db) => {
      // Get recent 10 stock movements
      const recentMovements = await db.stockMovement.findMany({
        where: { productId },
        orderBy: { movedAt: 'desc' },
        take: 10,
      });

      // Calculate totals
      const allMovements = await db.stockMovement.findMany({
        where: { productId },
      });

      const totalPurchased = allMovements
        .filter((m) => m.movementType === 'PURCHASE_IN')
        .reduce((sum, m) => sum + m.qty, 0);

      const totalSold = allMovements
        .filter((m) => m.movementType === 'SALE_OUT')
        .reduce((sum, m) => sum + m.qty, 0);

      const totalReturned = allMovements
        .filter((m) => m.movementType === 'RETURN')
        .reduce((sum, m) => sum + m.qty, 0);

      return {
        product: {
          id: product.id,
          adminId: product.adminId,
          shopId: product.shopId,
          brandName: product.brandName,
          name: product.name,
          category: product.category,
          accessoryType: product.accessoryType,
          purchasePrice: Number(product.purchasePrice),
          sellingPrice: Number(product.sellingPrice),
          stockQty: product.stockQty,
          lowStockAlertQty: product.lowStockAlertQty,
          isActive: product.isActive,
          createdAt: product.createdAt,
          stockStatus:
            product.stockQty === 0
              ? 'OUT_OF_STOCK'
              : product.stockQty <= product.lowStockAlertQty
                ? 'LOW_STOCK'
                : 'IN_STOCK',
        },
        recentMovements,
        summary: {
          totalPurchased,
          totalSold,
          totalReturned,
          currentStock: product.stockQty,
        },
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching product detail', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/inventory/products/[productId] - Update product
export async function PUT(
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

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { productId } = await params;
    const body = await request.json();

    const product = await verifyProductOwnership(adminId, productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Validate input
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if price fields are changing and require reason
    const priceChanged =
      (data.purchasePrice !== undefined &&
        data.purchasePrice !== Number(product.purchasePrice)) ||
      (data.sellingPrice !== undefined &&
        data.sellingPrice !== Number(product.sellingPrice));

    if (priceChanged && !body.reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price change requires a reason (minimum 10 characters)',
          requiresReason: true,
          changedFields: [
            data.purchasePrice !== undefined &&
            data.purchasePrice !== Number(product.purchasePrice)
              ? 'purchasePrice'
              : null,
            data.sellingPrice !== undefined &&
            data.sellingPrice !== Number(product.sellingPrice)
              ? 'sellingPrice'
              : null,
          ].filter(Boolean),
        },
        { status: 400 }
      );
    }

    if (body.reason && body.reason.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Price change reason must be at least 10 characters',
        },
        { status: 400 }
      );
    }

    // Update product with audit log for price changes
    const result = await withAdminContext(adminId, async (db) => {
      // Get admin info for audit log
      const admin = await db.admin.findUnique({
        where: { id: adminId },
        select: { ownerName: true },
      });

      // Create audit log entries for price changes
      if (priceChanged && body.reason) {
        const auditEntries = [];

        if (
          data.purchasePrice !== undefined &&
          data.purchasePrice !== Number(product.purchasePrice)
        ) {
          auditEntries.push({
            adminId,
            tableName: 'Product',
            recordId: productId,
            fieldName: 'purchasePrice',
            oldValue: String(Number(product.purchasePrice).toFixed(2)),
            newValue: String(data.purchasePrice.toFixed(2)),
            reason: body.reason,
            editedByType: 'ADMIN' as const,
            editedById: adminId,
            editedByName: admin?.ownerName || 'Unknown',
          });
        }

        if (
          data.sellingPrice !== undefined &&
          data.sellingPrice !== Number(product.sellingPrice)
        ) {
          auditEntries.push({
            adminId,
            tableName: 'Product',
            recordId: productId,
            fieldName: 'sellingPrice',
            oldValue: String(Number(product.sellingPrice).toFixed(2)),
            newValue: String(data.sellingPrice.toFixed(2)),
            reason: body.reason,
            editedByType: 'ADMIN' as const,
            editedById: adminId,
            editedByName: admin?.ownerName || 'Unknown',
          });
        }

        if (auditEntries.length > 0) {
          await db.auditLog.createMany({
            data: auditEntries,
          });
        }
      }

      // Update product
      const updateData: any = { ...data };
      if (data.brandName) updateData.brandName = data.brandName.trim();
      if (data.name) updateData.name = data.name.trim();

      const updatedProduct = await db.product.update({
        where: { id: productId },
        data: updateData,
      });

      return updatedProduct;
    });

    logger.info('Product updated', {
      adminId,
      productId,
      changes: Object.keys(data),
    });

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: result.id,
        brandName: result.brandName,
        name: result.name,
        category: result.category,
        purchasePrice: Number(result.purchasePrice),
        sellingPrice: Number(result.sellingPrice),
        stockQty: result.stockQty,
      },
    });
  } catch (error) {
    logger.error('Error updating product', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/inventory/products/[productId] - Soft delete product
export async function DELETE(
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

    const { payload } = await jwtVerify(token);

    if (payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const adminId = payload.adminId;
    const { productId } = await params;

    const product = await verifyProductOwnership(adminId, productId);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if product has active sales
    const activeSales = await withAdminContext(adminId, async (db) => {
      return db.saleItem.count({
        where: { productId },
      });
    });

    if (activeSales > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete product with sales history',
          suggestion: 'Deactivate instead',
        },
        { status: 400 }
      );
    }

    // Check if product is used in active repairs
    const activeRepairs = await withAdminContext(adminId, async (db) => {
      return db.repairPartUsed.count({
        where: { productId },
      });
    });

    if (activeRepairs > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete product used in active repairs',
          suggestion: 'Deactivate instead',
        },
        { status: 400 }
      );
    }

    // Soft delete - set isActive to false
    await withAdminContext(adminId, async (db) => {
      await db.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
    });

    logger.warn('Product deactivated', { adminId, productId, name: product.name });

    return NextResponse.json({
      success: true,
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    logger.error('Error deleting product', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
