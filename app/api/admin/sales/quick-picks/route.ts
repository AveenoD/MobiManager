import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import logger from '@/lib/logger';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';

function jsonCors(request: NextRequest, body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  return applySecurityHeaders(createCorsResponse(request, res));
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflight(request);
}

type ProductRow = {
  id: string;
  name: string;
  brandName: string;
  category: string;
  sellingPrice: number;
  purchasePrice: number;
  stockQty: number;
  soldQtyLast30d?: number;
};

function toProductRow(p: {
  id: string;
  name: string;
  brandName: string;
  category: string;
  purchasePrice: unknown;
  sellingPrice: unknown;
  stockQty: number;
}, soldQtyLast30d?: number): ProductRow {
  return {
    id: p.id,
    name: p.name,
    brandName: p.brandName,
    category: p.category,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    stockQty: p.stockQty,
    ...(soldQtyLast30d != null ? { soldQtyLast30d } : {}),
  };
}

/**
 * GET /api/admin/sales/quick-picks?shopId=
 * Suggestions for New Sale: trending (30d), new stock, recently sold SKUs.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return jsonCors(request, { success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const shopIdParam = request.nextUrl.searchParams.get('shopId');
    let shopId = shopIdParam || '';
    if (actor.shopId) {
      shopId = actor.shopId;
    }
    if (!shopId) {
      return jsonCors(request, { success: false, error: 'shopId required' }, { status: 400 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const payloadOut = await withAdminContext(adminId, async (db) => {
      const shop = await db.shop.findFirst({
        where: { id: shopId, adminId },
        select: { id: true, name: true },
      });
      if (!shop) {
        return { error: 'Shop not found', status: 404 as const };
      }

      const saleWhereActive = { shopId, createdAt: { gte: since }, status: 'ACTIVE' as const };

      let saleItems30: { productId: string; qty: number }[] = [];
      try {
        saleItems30 = await db.saleItem.findMany({
          where: { sale: saleWhereActive },
          select: { productId: true, qty: true },
        });
      } catch (e) {
        const err = e as { code?: string };
        if (err?.code === 'P2022') {
          saleItems30 = await db.saleItem.findMany({
            where: { sale: { shopId, createdAt: { gte: since } } },
            select: { productId: true, qty: true },
          });
        } else {
          throw e;
        }
      }

      const qtyByProduct: Record<string, number> = {};
      for (const row of saleItems30) {
        qtyByProduct[row.productId] = (qtyByProduct[row.productId] || 0) + row.qty;
      }
      const trendingIds = Object.entries(qtyByProduct)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([id]) => id);

      const trendingProducts =
        trendingIds.length === 0
          ? []
          : await db.item.findMany({
              where: {
                id: { in: trendingIds },
                shopId,
                adminId,
                isActive: true,
                stockQty: { gt: 0 },
              },
            });

      const trendingOrder = new Map(trendingIds.map((id, i) => [id, i]));
      const trending: ProductRow[] = [...trendingProducts]
        .sort((a, b) => (trendingOrder.get(a.id) ?? 99) - (trendingOrder.get(b.id) ?? 99))
        .map((p) => toProductRow(p, qtyByProduct[p.id] || 0));

      const recentStock = await db.item.findMany({
        where: { shopId, adminId, isActive: true, stockQty: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 14,
      });

      let recentSales: { id: string; createdAt: Date }[] = [];
      try {
        recentSales = await db.sale.findMany({
          where: { shopId, adminId, status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, createdAt: true },
        });
      } catch (e) {
        const err = e as { code?: string };
        if (err?.code === 'P2022') {
          recentSales = await db.sale.findMany({
            where: { shopId, adminId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, createdAt: true },
          });
        } else {
          throw e;
        }
      }

      const saleIds = recentSales.map((s) => s.id);
      const seen = new Set<string>();
      const repeatIds: string[] = [];
      outer: for (const saleId of saleIds) {
        const lines = await db.saleItem.findMany({
          where: { saleId },
          select: { productId: true },
          orderBy: { id: 'desc' },
          take: 24,
        });
        for (const row of lines) {
          if (seen.has(row.productId)) continue;
          seen.add(row.productId);
          repeatIds.push(row.productId);
          if (repeatIds.length >= 14) break outer;
        }
      }

      const repeatProducts =
        repeatIds.length === 0
          ? []
          : await db.item.findMany({
              where: {
                id: { in: repeatIds },
                shopId,
                adminId,
                isActive: true,
                stockQty: { gt: 0 },
              },
            });
      const repeatOrder = new Map(repeatIds.map((id, i) => [id, i]));
      const repeatBuy: ProductRow[] = [...repeatProducts]
        .sort((a, b) => (repeatOrder.get(a.id) ?? 99) - (repeatOrder.get(b.id) ?? 99))
        .map((p) => toProductRow(p));

      return {
        shop: { id: shop.id, name: shop.name },
        trending,
        recentStock: recentStock.map((p) => toProductRow(p)),
        repeatBuy,
      };
    });

    if ('error' in payloadOut && payloadOut.status === 404) {
      return jsonCors(request, { success: false, error: payloadOut.error }, { status: 404 });
    }

    return jsonCors(request, { success: true, ...payloadOut });
  } catch (error) {
    logger.error('sales quick-picks error', { error });
    return jsonCors(request, { success: false, error: 'Failed to load quick picks' }, { status: 500 });
  }
}
