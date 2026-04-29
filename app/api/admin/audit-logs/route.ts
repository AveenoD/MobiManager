import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { z } from 'zod';
import { getShopFilter } from '@/lib/permissions';
import { assertModuleEnabled, MODULE_KEYS } from '@/lib/modules';

const TABLE_DISPLAY_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  Product: { icon: '📦', color: 'purple', name: 'Product' },
  Sale: { icon: '💰', color: 'green', name: 'Sale' },
  Repair: { icon: '🔧', color: 'blue', name: 'Repair' },
  RechargeTransfer: { icon: '💸', color: 'yellow', name: 'Recharge' },
  SubAdmin: { icon: '👥', color: 'orange', name: 'Sub-Admin' },
  Shop: { icon: '🏪', color: 'grey', name: 'Shop' },
};

const auditLogFilterSchema = z.object({
  tableName: z.enum(['Product', 'Sale', 'Repair', 'RechargeTransfer', 'SubAdmin', 'Shop']).optional(),
  editedByType: z.enum(['ADMIN', 'SUB_ADMIN']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Helper to get display title for a record
async function getDisplayTitle(db: any, tableName: string, recordId: string): Promise<string> {
  try {
    switch (tableName) {
      case 'Repair': {
        const repair = await db.repair.findUnique({
          where: { id: recordId },
          select: { repairNumber: true, customerName: true },
        });
        if (repair) {
          return `Repair #${repair.repairNumber} — ${repair.customerName}`;
        }
        break;
      }
      case 'Product': {
        const product = await db.product.findUnique({
          where: { id: recordId },
          select: { name: true, brandName: true },
        });
        if (product) {
          return `${product.brandName} ${product.name}`;
        }
        break;
      }
      case 'Sale': {
        const sale = await db.sale.findUnique({
          where: { id: recordId },
          select: { saleNumber: true, customerName: true },
        });
        if (sale) {
          return `Sale #${sale.saleNumber}${sale.customerName ? ` — ${sale.customerName}` : ''}`;
        }
        break;
      }
      case 'SubAdmin': {
        const subAdmin = await db.subAdmin.findUnique({
          where: { id: recordId },
          select: { name: true },
        });
        if (subAdmin) {
          return `Staff: ${subAdmin.name}`;
        }
        break;
      }
      case 'RechargeTransfer': {
        const recharge = await db.rechargeTransfer.findUnique({
          where: { id: recordId },
          select: { serviceType: true, customerName: true, amount: true },
        });
        if (recharge) {
          const typeMap: Record<string, string> = {
            MOBILE_RECHARGE: 'Mobile',
            DTH: 'DTH',
            ELECTRICITY: 'Electricity',
            MONEY_TRANSFER: 'Transfer',
            OTHER: 'Recharge',
          };
          return `${typeMap[recharge.serviceType] || 'Recharge'} — ${recharge.customerName}`;
        }
        break;
      }
    }
  } catch (error) {
    // Ignore errors, return generic title
  }
  return `${tableName} #${recordId.slice(0, 8)}`;
}

// GET /api/admin/audit-logs - List all audit logs
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.AUDIT_ADVANCED);
    if (blocked) return blocked;

    // Only ADMIN can view audit logs (not sub-admins)
    if (actor.type !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Only admin can view audit logs' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      tableName: searchParams.get('tableName') || undefined,
      editedByType: searchParams.get('editedByType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      search: searchParams.get('search') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    const validation = auditLogFilterSchema.safeParse(filters);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const page = validation.data.page || 1;
    const limit = Math.min(validation.data.limit || 20, 100);
    const skip = (page - 1) * limit;

    const result = await withAdminContext(adminId, async (db) => {
      const where: Record<string, unknown> = { adminId };

      if (validation.data.tableName) {
        where.tableName = validation.data.tableName;
      }
      if (validation.data.editedByType) {
        where.editedByType = validation.data.editedByType;
      }
      if (validation.data.startDate || validation.data.endDate) {
        where.createdAt = {};
        if (validation.data.startDate) {
          (where.createdAt as Record<string, unknown>).gte = new Date(validation.data.startDate);
        }
        if (validation.data.endDate) {
          (where.createdAt as Record<string, unknown>).lte = new Date(validation.data.endDate + 'T23:59:59.999Z');
        }
      }
      if (validation.data.search) {
        where.OR = [
          { fieldName: { contains: validation.data.search, mode: 'insensitive' } },
          { reason: { contains: validation.data.search, mode: 'insensitive' } },
          { editedByName: { contains: validation.data.search, mode: 'insensitive' } },
        ];
      }

      const [logs, total, statsByType, statsByTable, thisWeekCount] = await Promise.all([
        db.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        db.auditLog.count({ where }),
        db.auditLog.groupBy({
          by: ['editedByType'],
          where: { adminId },
          _count: true,
        }),
        db.auditLog.groupBy({
          by: ['tableName'],
          where: { adminId },
          _count: true,
        }),
        db.auditLog.count({
          where: {
            adminId,
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0) - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      // Get display titles for each log
      const logsWithTitles = await Promise.all(
        logs.map(async (log) => {
          const displayTitle = await getDisplayTitle(db, log.tableName, log.recordId);
          const config = TABLE_DISPLAY_CONFIG[log.tableName] || { icon: '📋', color: 'grey', name: log.tableName };
          return {
            ...log,
            displayTitle,
            icon: config.icon,
            color: config.color,
            moduleName: config.name,
          };
        })
      );

      // Calculate summary stats
      const editsByAdmin = statsByType.find((s: any) => s.editedByType === 'ADMIN')?._count || 0;
      const editsBySubAdmin = statsByType.find((s: any) => s.editedByType === 'SUB_ADMIN')?._count || 0;
      const mostEditedTableArr = statsByTable.sort((a: any, b: any) => b._count - a._count);
      const mostEditedTable = mostEditedTableArr[0]?.tableName || 'N/A';

      // Find who made most edits
      const editsByPerson = await db.auditLog.groupBy({
        by: ['editedByName'],
        where: { adminId },
        _count: true,
        orderBy: { _count: { editedByName: 'desc' } },
        take: 1,
      });
      const mostEditedBy = editsByPerson[0]?.editedByName || 'N/A';

      return {
        logs: logsWithTitles,
        total,
        summary: {
          totalEdits: total,
          editsByAdmin,
          editsBySubAdmin,
          mostEditedTable,
          mostEditedBy,
          thisWeekCount,
        },
      };
    });

    return NextResponse.json({
      success: true,
      logs: result.logs,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
      summary: result.summary,
    });
  } catch (error) {
    logger.error('Error fetching audit logs', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';