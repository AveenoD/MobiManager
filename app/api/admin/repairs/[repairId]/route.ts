import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { updateRepairSchema, statusUpdateSchema } from '@/lib/validations/repair.schema';
import { Decimal } from '@prisma/client/runtime/library';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

type RouteContext = {
  params: Promise<{ repairId: string }>;
};

// GET /api/admin/repairs/[repairId] - Get repair detail
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;
    const { repairId } = await context.params;

    const [repair, auditLogs] = await withAdminContext(adminId, async (db) => {
      const repairData = await db.repair.findFirst({
        where: { id: repairId, adminId },
        include: {
          shop: { select: { name: true, address: true } },
          partsUsed: {
            include: {
              product: { select: { name: true, brandName: true } },
            },
          },
        },
      });

      if (!repairData) return [null, []];

      const auditLogData = await db.auditLog.findMany({
        where: { recordId: repairId, tableName: 'Repair' },
        orderBy: { createdAt: 'desc' },
      });

      return [repairData, auditLogData];
    });

    if (!repair) {
      return NextResponse.json({ success: false, error: 'Repair not found' }, { status: 404 });
    }

    const totalPartsCost = repair.partsUsed.reduce((sum, p) => sum + Number(p.cost) * p.qty, 0);
    const profitIfDelivered = Number(repair.customerCharge) - Number(repair.repairCost) - totalPartsCost;

    return NextResponse.json({
      success: true,
      repair: {
        ...repair,
        repairCost: Number(repair.repairCost),
        customerCharge: Number(repair.customerCharge),
        advancePaid: Number(repair.advancePaid),
        pendingAmount: Number(repair.pendingAmount),
        totalPartsCost,
        profitIfDelivered,
      },
      auditLogs,
    });
  } catch (error) {
    logger.error('Error fetching repair detail', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch repair' }, { status: 500 });
  }
}

// PUT /api/admin/repairs/[repairId] - Update repair details
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;
    const { repairId } = await context.params;

    // Check if repair exists and is not delivered/cancelled
    const existingRepair = await withAdminContext(adminId, async (db) => {
      return db.repair.findFirst({
        where: { id: repairId, adminId },
      });
    });

    if (!existingRepair) {
      return NextResponse.json({ success: false, error: 'Repair not found' }, { status: 404 });
    }

    if (existingRepair.status === 'DELIVERED' || existingRepair.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a delivered or cancelled repair' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateRepairSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    if (!body.reason) {
      return NextResponse.json(
        { success: false, error: 'Reason is required for updates' },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const changedFields: { field: string; oldValue: any; newValue: any }[] = [];

    const result = await withAdminContext(adminId, async (db) => {
      // Check each field for changes
      if (updateData.customerName && updateData.customerName !== existingRepair.customerName) {
        changedFields.push({
          field: 'customerName',
          oldValue: existingRepair.customerName,
          newValue: updateData.customerName,
        });
      }
      if (updateData.customerPhone && updateData.customerPhone !== existingRepair.customerPhone) {
        changedFields.push({
          field: 'customerPhone',
          oldValue: existingRepair.customerPhone,
          newValue: updateData.customerPhone,
        });
      }
      if (updateData.deviceBrand && updateData.deviceBrand !== existingRepair.deviceBrand) {
        changedFields.push({
          field: 'deviceBrand',
          oldValue: existingRepair.deviceBrand,
          newValue: updateData.deviceBrand,
        });
      }
      if (updateData.deviceModel && updateData.deviceModel !== existingRepair.deviceModel) {
        changedFields.push({
          field: 'deviceModel',
          oldValue: existingRepair.deviceModel,
          newValue: updateData.deviceModel,
        });
      }
      if (updateData.issueDescription && updateData.issueDescription !== existingRepair.issueDescription) {
        changedFields.push({
          field: 'issueDescription',
          oldValue: existingRepair.issueDescription,
          newValue: updateData.issueDescription,
        });
      }
      if (updateData.estimatedDelivery) {
        const newDate = new Date(updateData.estimatedDelivery);
        const oldDate = existingRepair.estimatedDelivery ? new Date(existingRepair.estimatedDelivery) : null;
        if (!oldDate || newDate.getTime() !== oldDate.getTime()) {
          changedFields.push({
            field: 'estimatedDelivery',
            oldValue: existingRepair.estimatedDelivery,
            newValue: updateData.estimatedDelivery,
          });
        }
      }
      if (updateData.repairCost !== undefined && Number(updateData.repairCost) !== Number(existingRepair.repairCost)) {
        changedFields.push({
          field: 'repairCost',
          oldValue: Number(existingRepair.repairCost),
          newValue: updateData.repairCost,
        });
      }
      if (updateData.customerCharge !== undefined && Number(updateData.customerCharge) !== Number(existingRepair.customerCharge)) {
        changedFields.push({
          field: 'customerCharge',
          oldValue: Number(existingRepair.customerCharge),
          newValue: updateData.customerCharge,
        });
      }
      if (updateData.advancePaid !== undefined && Number(updateData.advancePaid) !== Number(existingRepair.advancePaid)) {
        changedFields.push({
          field: 'advancePaid',
          oldValue: Number(existingRepair.advancePaid),
          newValue: updateData.advancePaid,
        });
      }
      if (updateData.notes !== undefined && updateData.notes !== existingRepair.notes) {
        changedFields.push({
          field: 'notes',
          oldValue: existingRepair.notes,
          newValue: updateData.notes,
        });
      }

      // Build update payload
      const data: any = {};
      if (updateData.customerName) data.customerName = updateData.customerName;
      if (updateData.customerPhone) data.customerPhone = updateData.customerPhone;
      if (updateData.deviceBrand) data.deviceBrand = updateData.deviceBrand;
      if (updateData.deviceModel) data.deviceModel = updateData.deviceModel;
      if (updateData.issueDescription) data.issueDescription = updateData.issueDescription;
      if (updateData.estimatedDelivery) data.estimatedDelivery = new Date(updateData.estimatedDelivery);
      if (updateData.repairCost !== undefined) data.repairCost = new Decimal(updateData.repairCost);
      if (updateData.customerCharge !== undefined) data.customerCharge = new Decimal(updateData.customerCharge);
      if (updateData.advancePaid !== undefined) data.advancePaid = new Decimal(updateData.advancePaid);
      if (updateData.notes !== undefined) data.notes = updateData.notes;

      // Recalculate pendingAmount if customerCharge or advancePaid changed
      if (updateData.customerCharge !== undefined || updateData.advancePaid !== undefined) {
        const newCharge = updateData.customerCharge !== undefined ? updateData.customerCharge : Number(existingRepair.customerCharge);
        const newAdvance = updateData.advancePaid !== undefined ? updateData.advancePaid : Number(existingRepair.advancePaid);
        data.pendingAmount = new Decimal(newCharge - newAdvance);
      }

      // Update repair
      const updatedRepair = await db.repair.update({
        where: { id: repairId },
        data,
      });

      // Create audit log entries for each changed field
      for (const change of changedFields) {
        await db.auditLog.create({
          data: {
            adminId,
            tableName: 'Repair',
            recordId: repairId,
            fieldName: change.field,
            oldValue: change.oldValue !== null ? String(change.oldValue) : null,
            newValue: change.newValue !== null ? String(change.newValue) : null,
            reason: body.reason,
            editedByType: 'ADMIN',
            editedById: adminId,
            editedByName: payload.adminName as string || 'Admin',
          },
        });
      }

      return updatedRepair;
    });

    logger.info('Repair updated', { adminId, repairId, changedFields });

    return NextResponse.json({
      success: true,
      message: 'Repair updated successfully',
      repair: result,
      changedFields,
    });
  } catch (error) {
    logger.error('Error updating repair', { error });
    return NextResponse.json({ success: false, error: 'Failed to update repair' }, { status: 500 });
  }
}

// PATCH /api/admin/repairs/[repairId] - Status update only
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }
    const adminId = payload.adminId as string;
    const { repairId } = await context.params;

    // Check if repair exists
    const existingRepair = await withAdminContext(adminId, async (db) => {
      return db.repair.findFirst({
        where: { id: repairId, adminId },
      });
    });

    if (!existingRepair) {
      return NextResponse.json({ success: false, error: 'Repair not found' }, { status: 404 });
    }

    if (existingRepair.status === 'DELIVERED' || existingRepair.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Cannot change status of a delivered or cancelled repair' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = statusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { status: newStatus, reason } = validation.data;

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      RECEIVED: ['IN_REPAIR', 'CANCELLED'],
      IN_REPAIR: ['REPAIRED', 'CANCELLED'],
      REPAIRED: ['DELIVERED', 'IN_REPAIR'],
      DELIVERED: [],
      CANCELLED: [],
    };

    const currentStatus = existingRepair.status;
    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedStatuses.join(', ') || 'none'}`,
        },
        { status: 400 }
      );
    }

    const result = await withAdminContext(adminId, async (db) => {
      const data: any = { status: newStatus };

      // Handle completionDate when REPAIRED
      if (newStatus === 'REPAIRED') {
        data.completionDate = new Date();
      }

      // Handle deliveryDate and final advance collection when DELIVERED
      if (newStatus === 'DELIVERED') {
        data.deliveryDate = new Date();

        // Collect any remaining amount as final advance
        const currentPending = Number(existingRepair.pendingAmount);
        if (currentPending > 0) {
          data.advancePaid = new Decimal(Number(existingRepair.advancePaid) + currentPending);
          data.pendingAmount = new Decimal(0);
        }

        // Create audit log for final payment collection
        await db.auditLog.create({
          data: {
            adminId,
            tableName: 'Repair',
            recordId: repairId,
            fieldName: 'finalPayment',
            oldValue: String(currentPending),
            newValue: String(currentPending),
            reason: reason || 'Final payment collected on delivery',
            editedByType: 'ADMIN',
            editedById: adminId,
            editedByName: payload.adminName as string || 'Admin',
          },
        });
      }

      // Update repair
      const updatedRepair = await db.repair.update({
        where: { id: repairId },
        data,
      });

      // Create audit log for status change
      await db.auditLog.create({
        data: {
          adminId,
          tableName: 'Repair',
          recordId: repairId,
          fieldName: 'status',
          oldValue: currentStatus,
          newValue: newStatus,
          reason: reason || `Status changed from ${currentStatus} to ${newStatus}`,
          editedByType: 'ADMIN',
          editedById: adminId,
          editedByName: payload.adminName as string || 'Admin',
        },
      });

      return updatedRepair;
    });

    logger.info('Repair status updated', { adminId, repairId, oldStatus: currentStatus, newStatus });

    return NextResponse.json({
      success: true,
      message: `Repair status changed to ${newStatus}`,
      repair: result,
    });
  } catch (error) {
    logger.error('Error updating repair status', { error });
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }
}
