import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import { getActorFromPayload } from '@/lib/auth';
import { assertAiAccess } from '@/lib/services/aiQuota';
import logger from '@/lib/logger';
import { createRepairSchema } from '@/lib/validations/repair.schema';
import { Decimal } from '@prisma/client/runtime/library';
import { findOrCreateCustomer } from '@/lib/services/customer';
import { normalizePhone } from '@/lib/phone';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const accessBlocked = await assertAiAccess(adminId);
    if (accessBlocked) return accessBlocked;

    const body = await request.json();
    const { extractionId, ...repairInput } = body ?? {};
    if (!extractionId) {
      return NextResponse.json({ success: false, error: 'Missing extractionId' }, { status: 400 });
    }

    const validation = createRepairSchema.safeParse(repairInput);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const result = await withAdminContext(adminId, async (db) => {
      const extraction = await (db as any).aIExtraction.findFirst({
        where: { id: extractionId, adminId, status: 'PENDING' },
        select: { id: true, expiresAt: true },
      });

      if (!extraction) {
        return { error: 'Extraction not found', status: 404 as const };
      }

      if (new Date(extraction.expiresAt) < new Date()) {
        await (db as any).aIExtraction.update({
          where: { id: extractionId },
          data: { status: 'EXPIRED' },
        });
        return { error: 'Extraction expired', status: 410 as const };
      }

      const {
        shopId,
        customerName,
        customerPhone,
        deviceBrand,
        deviceModel,
        issueDescription,
        repairCost,
        customerCharge,
        advancePaid,
        estimatedDelivery,
        notes,
      } = validation.data;

      // Subadmin shop restriction
      if (actor.type === 'SUB_ADMIN' && shopId !== actor.shopId) {
        return { error: 'You can only create repairs for your assigned shop', status: 403 as const };
      }

      let customerId: string | null = null;
      const norm = normalizePhone(customerPhone);
      if (norm) {
        const { customer } = await findOrCreateCustomer(db as any, adminId, customerPhone, customerName);
        customerId = customer.id;
      }

      // Generate repair number
      const last = await (db as any).repair.findFirst({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        select: { repairNumber: true },
      });
      const lastNum = last?.repairNumber ? parseInt(String(last.repairNumber).split('-')[1]) : 0;
      const repairNumber = `R-${String(lastNum + 1).padStart(5, '0')}`;

      const repair = await (db as any).repair.create({
        data: {
          adminId,
          shopId,
          customerId,
          repairNumber,
          createdByType: actor.type,
          createdById: actor.type === 'ADMIN' ? adminId : (actor.subAdminId || ''),
          customerName,
          customerPhone,
          deviceBrand,
          deviceModel,
          issueDescription,
          repairCost: new Decimal(repairCost || 0),
          customerCharge: new Decimal(customerCharge || 0),
          advancePaid: new Decimal(advancePaid || 0),
          pendingAmount: new Decimal(Math.max(0, (customerCharge || 0) - (advancePaid || 0))),
          status: 'RECEIVED',
          receivedDate: new Date(),
          estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
          notes: notes || null,
        },
      });

      await (db as any).aIExtraction.update({
        where: { id: extractionId },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
      });

      return { repair };
    });

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    logger.info('Repair created from AI extraction', { adminId, repairId: result.repair.id, by: actor.type });

    return NextResponse.json({ success: true, repair: result.repair });
  } catch (error) {
    logger.error('AI repair confirm error', { error });
    return NextResponse.json({ success: false, error: 'Failed to confirm repair' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

