import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { updateRechargeSchema } from '@/lib/validations/recharge.schema';
import { Decimal } from '@prisma/client/runtime/library';
import { getActorFromPayload } from '@/lib/auth';
import { requirePermission } from '@/lib/permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  MOBILE_RECHARGE: 'Mobile Recharge',
  DTH: 'DTH Recharge',
  ELECTRICITY: 'Electricity Bill',
  MONEY_TRANSFER: 'Money Transfer',
  OTHER: 'Other',
};

// GET /api/admin/recharge/[rechargeId] - Get single recharge record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rechargeId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const { rechargeId } = await params;

    const record = await withAdminContext(adminId, async (db) => {
      return db.rechargeTransfer.findFirst({
        where: { id: rechargeId, adminId },
        include: {
          shop: { select: { name: true } },
        },
      });
    });

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      record: {
        id: record.id,
        serviceType: record.serviceType,
        serviceTypeDisplay: SERVICE_TYPE_DISPLAY[record.serviceType],
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        beneficiaryNumber: record.beneficiaryNumber,
        operator: record.operator,
        amount: Number(record.amount),
        commissionEarned: Number(record.commissionEarned),
        netProfit: Number(record.commissionEarned),
        transactionRef: record.transactionRef,
        status: record.status,
        transactionDate: record.transactionDate,
        shopName: record.shop?.name,
      },
    });
  } catch (error) {
    logger.error('Error fetching recharge record', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch record' }, { status: 500 });
  }
}

// PUT /api/admin/recharge/[rechargeId] - Update recharge record (status, ref, commission)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ rechargeId: string }> }
) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    if (actor.type === 'SUB_ADMIN') {
      requirePermission(actor, 'edit');
    }

    const { rechargeId } = await params;

    const body = await request.json();
    const validation = updateRechargeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { status, transactionRef, commissionEarned, notes, reason } = validation.data;

    // Fetch existing record
    const existing = await withAdminContext(adminId, async (db) => {
      return db.rechargeTransfer.findFirst({
        where: { id: rechargeId, adminId },
      });
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    // Cannot edit SUCCESS records older than 24 hours
    if (
      existing.status === 'SUCCESS' &&
      new Date(existing.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot edit completed transaction older than 24 hours',
        },
        { status: 400 }
      );
    }

    // Check if values changed
    const changedFields: string[] = [];
    if (status && status !== existing.status) changedFields.push('status');
    if (transactionRef !== undefined && transactionRef !== existing.transactionRef) changedFields.push('transactionRef');
    if (commissionEarned !== undefined && commissionEarned !== Number(existing.commissionEarned)) changedFields.push('commissionEarned');

    if (changedFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No changes to update' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (transactionRef !== undefined) updateData.transactionRef = transactionRef || null;
    if (commissionEarned !== undefined) {
      updateData.commissionEarned = new Decimal(commissionEarned);
      updateData.netProfit = new Decimal(commissionEarned);
    }

    // Update record
    const result = await withAdminContext(adminId, async (db) => {
      const updated = await db.rechargeTransfer.update({
        where: { id: rechargeId },
        data: updateData,
        include: { shop: { select: { name: true } } },
      });

      // Create audit log for each changed field
      const auditEntries = [];
      if (status && status !== existing.status) {
        auditEntries.push({
          adminId,
          tableName: 'RechargeTransfer',
          recordId: rechargeId,
          fieldName: 'status',
          oldValue: existing.status,
          newValue: status,
          reason,
          editedByType: actor.type,
          editedById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          editedByName: actor.type === 'ADMIN' ? 'Admin' : (actor.name || 'Staff'),
        });
      }
      if (transactionRef !== undefined && transactionRef !== existing.transactionRef) {
        auditEntries.push({
          adminId,
          tableName: 'RechargeTransfer',
          recordId: rechargeId,
          fieldName: 'transactionRef',
          oldValue: existing.transactionRef || '',
          newValue: transactionRef || '',
          reason,
          editedByType: actor.type,
          editedById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          editedByName: actor.type === 'ADMIN' ? 'Admin' : (actor.name || 'Staff'),
        });
      }
      if (commissionEarned !== undefined && commissionEarned !== Number(existing.commissionEarned)) {
        auditEntries.push({
          adminId,
          tableName: 'RechargeTransfer',
          recordId: rechargeId,
          fieldName: 'commissionEarned',
          oldValue: String(Number(existing.commissionEarned)),
          newValue: String(commissionEarned),
          reason,
          editedByType: actor.type,
          editedById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          editedByName: actor.type === 'ADMIN' ? 'Admin' : (actor.name || 'Staff'),
        });
      }

      if (auditEntries.length > 0) {
        await db.auditLog.createMany({ data: auditEntries });
      }

      return updated;
    });

    logger.info('Recharge entry updated', {
      adminId,
      rechargeId,
      changes: changedFields,
      by: actor.type,
    });

    return NextResponse.json({
      success: true,
      message: 'Entry updated!',
      record: {
        id: result.id,
        serviceType: result.serviceType,
        serviceTypeDisplay: SERVICE_TYPE_DISPLAY[result.serviceType],
        customerName: result.customerName,
        customerPhone: result.customerPhone,
        beneficiaryNumber: result.beneficiaryNumber,
        operator: result.operator,
        amount: Number(result.amount),
        commissionEarned: Number(result.commissionEarned),
        transactionRef: result.transactionRef,
        status: result.status,
        transactionDate: result.transactionDate,
        shopName: result.shop?.name,
      },
    });
  } catch (error) {
    logger.error('Error updating recharge record', { error });
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';