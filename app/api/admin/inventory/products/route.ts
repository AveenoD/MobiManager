import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { prisma, withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { createProductSchema, productQuerySchema } from '@/lib/validations/inventory.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

// GET /api/admin/inventory/products - List products with filters
export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      category: searchParams.get('category') || undefined,
      brandName: searchParams.get('brandName') || undefined,
      search: searchParams.get('search') || undefined,
      stockStatus: searchParams.get('stockStatus') || undefined,
      shopId: searchParams.get('shopId') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    };

    const queryValidation = productQuerySchema.safeParse(queryParams);

    if (!queryValidation.success) {
      return NextResponse.json(
        { success: false, error: queryValidation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { category, brandName, search, stockStatus, shopId, page, limit, sortBy, sortOrder } =
      queryValidation.data;

    const result = await withAdminContext(adminId, async (db) => {
      // Build where clause
      const where: any = { isActive: true };

      if (category) {
        where.category = category;
      }

      if (brandName) {
        where.brandName = { contains: brandName, mode: 'insensitive' };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { brandName: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (shopId) {
        where.shopId = shopId;
      }

      // Stock status filter (computed)
      if (stockStatus) {
        if (stockStatus === 'OUT_OF_STOCK') {
          where.stockQty = 0;
        } else if (stockStatus === 'LOW_STOCK') {
          where.AND = [
            { stockQty: { gt: 0 } },
            { stockQty: { lte: db.product.fields.lowStockAlertQty } },
          ];
        } else if (stockStatus === 'IN_STOCK') {
          where.AND = [
            { stockQty: { gt: db.product.fields.lowStockAlertQty } },
          ];
        }
      }

      // Get total count
      const total = await db.product.count({ where });

      // Get products with pagination
      const products = await db.product.findMany({
        where,
        include: {
          shop: {
            select: { name: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Compute stock status for each product
      const productsWithStatus = products.map((product) => {
        let computedStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
        if (product.stockQty === 0) {
          computedStatus = 'OUT_OF_STOCK';
        } else if (product.stockQty <= product.lowStockAlertQty) {
          computedStatus = 'LOW_STOCK';
        } else {
          computedStatus = 'IN_STOCK';
        }

        return {
          id: product.id,
          brandName: product.brandName,
          name: product.name,
          category: product.category,
          accessoryType: product.accessoryType,
          purchasePrice: Number(product.purchasePrice),
          sellingPrice: Number(product.sellingPrice),
          stockQty: product.stockQty,
          lowStockAlertQty: product.lowStockAlertQty,
          stockStatus: computedStatus,
          shopName: product.shop.name,
          isActive: product.isActive,
          createdAt: product.createdAt,
        };
      });

      // Get summary stats
      const allProducts = await db.product.findMany({
        where: { isActive: true },
        select: {
          category: true,
          stockQty: true,
          purchasePrice: true,
          sellingPrice: true,
        },
      });

      const summary = {
        totalProducts: allProducts.length,
        totalMobiles: allProducts.filter((p) => p.category === 'MOBILE').length,
        totalAccessories: allProducts.filter((p) => p.category === 'ACCESSORY').length,
        outOfStockCount: allProducts.filter((p) => p.stockQty === 0).length,
        lowStockCount: allProducts.filter(
          (p) => p.stockQty > 0 && p.stockQty <= p.stockQty
        ).length,
        totalInventoryValue: allProducts.reduce(
          (sum, p) => sum + Number(p.purchasePrice) * p.stockQty,
          0
        ),
        totalSellingValue: allProducts.reduce(
          (sum, p) => sum + Number(p.sellingPrice) * p.stockQty,
          0
        ),
      };

      return {
        products: productsWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching products', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/admin/inventory/products - Create new product
export async function POST(request: NextRequest) {
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
    const body = await request.json();

    // Validate input
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check plan limits
    const subscription = await prisma.subscription.findFirst({
      where: { adminId, isCurrent: true },
      include: { plan: true },
    });

    if (subscription?.plan.maxProducts) {
      const currentCount = await prisma.product.count({
        where: { adminId, isActive: true },
      });

      if (currentCount >= subscription.plan.maxProducts) {
        return NextResponse.json(
          {
            success: false,
            error: 'Product limit reached for your plan',
            limit: subscription.plan.maxProducts,
            current: currentCount,
            upgradeTo: 'Pro plan for unlimited products',
          },
          { status: 403 }
        );
      }
    }

    // Verify shop belongs to admin
    const shop = await prisma.shop.findFirst({
      where: { id: data.shopId, adminId },
    });

    if (!shop) {
      return NextResponse.json(
        { success: false, error: 'Invalid shop' },
        { status: 400 }
      );
    }

    // Create product with initial stock movement
    const result = await withAdminContext(adminId, async (db) => {
      const newProduct = await db.product.create({
        data: {
          adminId,
          shopId: data.shopId,
          brandName: data.brandName.trim(),
          name: data.name.trim(),
          category: data.category,
          accessoryType: data.accessoryType,
          purchasePrice: data.purchasePrice,
          sellingPrice: data.sellingPrice,
          stockQty: data.initialStock,
          lowStockAlertQty: data.lowStockAlertQty,
        },
      });

      // Create initial stock movement if stock > 0
      if (data.initialStock > 0) {
        await db.stockMovement.create({
          data: {
            adminId,
            productId: newProduct.id,
            movementType: 'PURCHASE_IN',
            qty: data.initialStock,
            notes: 'Initial stock entry',
            movedAt: new Date(),
          },
        });
      }

      return newProduct;
    });

    logger.info('Product created', { adminId, productId: result.id, name: result.name });

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: result.id,
        brandName: result.brandName,
        name: result.name,
        category: result.category,
        stockQty: result.stockQty,
      },
    });
  } catch (error) {
    logger.error('Error creating product', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
