import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import { z } from 'zod';
import { validateRequest } from '@/lib/validations';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const planSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  priceMonthly: z.number().positive('Monthly price must be positive'),
  priceYearly: z.number().positive('Yearly price must be positive'),
  maxProducts: z.number().positive().nullable(),
  maxSubAdmins: z.number().min(0, 'Max sub-admins cannot be negative'),
  maxShops: z.number().positive().nullable(),
  aiEnabled: z.boolean(),
  features: z.array(z.string()).min(1, 'At least one feature required'),
});

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.http('Plans list accessed', { saId: payload.id });

    const result = await withSuperAdminContext(async (db) => {
      const plans = await db.plan.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          subscriptions: {
            where: { isCurrent: true },
            select: { id: true },
          },
        },
      });

      return plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        priceMonthly: Number(plan.priceMonthly),
        priceYearly: Number(plan.priceYearly),
        maxProducts: plan.maxProducts,
        maxSubAdmins: plan.maxSubAdmins,
        maxShops: plan.maxShops,
        aiEnabled: plan.aiEnabled,
        features: plan.features as string[],
        isActive: plan.isActive,
        createdAt: plan.createdAt,
        subscribersCount: plan.subscriptions.length,
      }));
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error fetching plans', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('superadmin_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    if (payload.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateRequest(planSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    // Check for duplicate name
    const existing = await withSuperAdminContext(async (db) => {
      return db.plan.findUnique({ where: { name: validation.data.name } });
    });

    if (existing) {
      return NextResponse.json({ error: 'Plan name already exists' }, { status: 400 });
    }

    const plan = await withSuperAdminContext(async (db) => {
      return db.plan.create({
        data: {
          name: validation.data.name,
          priceMonthly: validation.data.priceMonthly,
          priceYearly: validation.data.priceYearly,
          maxProducts: validation.data.maxProducts,
          maxSubAdmins: validation.data.maxSubAdmins,
          maxShops: validation.data.maxShops,
          aiEnabled: validation.data.aiEnabled,
          features: validation.data.features,
        },
      });
    });

    logger.info('Plan created', { planId: plan.id, name: plan.name, by: payload.email });

    return NextResponse.json({
      success: true,
      message: 'Plan created successfully',
      data: {
        id: plan.id,
        name: plan.name,
        priceMonthly: Number(plan.priceMonthly),
        priceYearly: Number(plan.priceYearly),
        maxProducts: plan.maxProducts,
        maxSubAdmins: plan.maxSubAdmins,
        maxShops: plan.maxShops,
        aiEnabled: plan.aiEnabled,
        features: plan.features as string[],
        isActive: plan.isActive,
      },
    });
  } catch (error) {
    logger.error('Error creating plan', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}