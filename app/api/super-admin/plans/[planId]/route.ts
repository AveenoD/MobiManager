import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from '@/lib/jwt';
import { withSuperAdminContext } from '@/lib/db';
import { applySecurityHeaders } from '@/lib/security';
import { z } from 'zod';
import { validateRequest } from '@/lib/validations';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const planUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  priceMonthly: z.number().positive('Monthly price must be positive'),
  priceYearly: z.number().positive('Yearly price must be positive'),
  maxProducts: z.number().positive().nullable(),
  maxSubAdmins: z.number().min(0, 'Max sub-admins cannot be negative'),
  maxShops: z.number().positive().nullable(),
  aiEnabled: z.boolean(),
  features: z.array(z.string()).min(1, 'At least one feature required'),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
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

    const { planId } = await params;

    logger.http('Plan detail accessed', { saId: payload.id, planId });

    const plan = await withSuperAdminContext(async (db) => {
      return db.plan.findUnique({
        where: { id: planId },
        include: {
          subscriptions: {
            where: { isCurrent: true },
            select: { id: true },
          },
        },
      });
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
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
        createdAt: plan.createdAt,
        subscribersCount: plan.subscriptions.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching plan', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
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

    const { planId } = await params;

    const body = await request.json();
    const validation = validateRequest(planUpdateSchema, body);

    if (!validation.success) {
      return validation.error;
    }

    const plan = await withSuperAdminContext(async (db) => {
      return db.plan.findUnique({ where: { id: planId } });
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Check for duplicate name (excluding current plan)
    const existing = await withSuperAdminContext(async (db) => {
      return db.plan.findFirst({
        where: {
          name: validation.data.name,
          NOT: { id: planId },
        },
      });
    });

    if (existing) {
      return NextResponse.json({ error: 'Plan name already exists' }, { status: 400 });
    }

    const updated = await withSuperAdminContext(async (db) => {
      return db.plan.update({
        where: { id: planId },
        data: {
          name: validation.data.name,
          priceMonthly: validation.data.priceMonthly,
          priceYearly: validation.data.priceYearly,
          maxProducts: validation.data.maxProducts,
          maxSubAdmins: validation.data.maxSubAdmins,
          maxShops: validation.data.maxShops,
          aiEnabled: validation.data.aiEnabled,
          features: validation.data.features,
          isActive: validation.data.isActive ?? plan.isActive,
        },
      });
    });

    logger.info('Plan updated', { planId, name: updated.name, by: payload.email });

    return NextResponse.json({
      success: true,
      message: 'Plan updated successfully',
      data: {
        id: updated.id,
        name: updated.name,
        priceMonthly: Number(updated.priceMonthly),
        priceYearly: Number(updated.priceYearly),
        maxProducts: updated.maxProducts,
        maxSubAdmins: updated.maxSubAdmins,
        maxShops: updated.maxShops,
        aiEnabled: updated.aiEnabled,
        features: updated.features as string[],
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    logger.error('Error updating plan', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
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

    const { planId } = await params;

    // Check if plan has subscribers
    const activeSubscriptions = await withSuperAdminContext(async (db) => {
      return db.subscription.count({
        where: { planId, isCurrent: true },
      });
    });

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: `Cannot delete plan with ${activeSubscriptions} active subscribers. Deactivate instead.` },
        { status: 400 }
      );
    }

    // Soft delete by deactivating
    await withSuperAdminContext(async (db) => {
      return db.plan.update({
        where: { id: planId },
        data: { isActive: false },
      });
    });

    logger.info('Plan deactivated', { planId, by: payload.email });

    return NextResponse.json({ success: true, message: 'Plan deactivated successfully' });
  } catch (error) {
    logger.error('Error deleting plan', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}