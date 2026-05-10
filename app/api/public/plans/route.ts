import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applySecurityHeaders, createCorsResponse, handleCorsPreflight } from '@/lib/security';

function serializePlan(plan: {
  id: string;
  name: string;
  priceMonthly: unknown;
  priceYearly: unknown;
  maxProducts: number | null;
  maxSubAdmins: number;
  maxShops: number | null;
  aiEnabled: boolean;
  features: unknown;
  isActive: boolean;
}) {
  let features: string[] = [];
  if (Array.isArray(plan.features)) {
    features = plan.features.map(String);
  } else if (typeof plan.features === 'string') {
    try {
      const parsed = JSON.parse(plan.features) as unknown;
      features = Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      features = [];
    }
  }

  return {
    id: plan.id,
    name: plan.name,
    priceMonthly: Number(plan.priceMonthly),
    priceYearly: Number(plan.priceYearly),
    maxProducts: plan.maxProducts,
    maxSubAdmins: plan.maxSubAdmins,
    maxShops: plan.maxShops,
    aiEnabled: plan.aiEnabled,
    features,
    isActive: plan.isActive,
  };
}

export async function OPTIONS(request: NextRequest) {
  return applySecurityHeaders(handleCorsPreflight(request));
}

/** Public read-only plan list for marketing sites (no auth). */
export async function GET(request: NextRequest) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ priceMonthly: 'asc' }],
    });

    const res = NextResponse.json({
      success: true,
      plans: plans.map(serializePlan),
    });
    return applySecurityHeaders(createCorsResponse(request, res));
  } catch (error) {
    console.error('Public plans GET error:', error);
    const res = NextResponse.json({ success: false, error: 'Failed to load plans' }, { status: 500 });
    return applySecurityHeaders(createCorsResponse(request, res));
  }
}
