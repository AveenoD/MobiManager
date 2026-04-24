import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-chars-required-here';

const TABLE_DISPLAY_CONFIG: Record<string, { icon: string; color: string; name: string }> = {
  Product: { icon: '📦', color: 'purple', name: 'Product' },
  Sale: { icon: '💰', color: 'green', name: 'Sale' },
  Repair: { icon: '🔧', color: 'blue', name: 'Repair' },
  RechargeTransfer: { icon: '💸', color: 'yellow', name: 'Recharge' },
  SubAdmin: { icon: '👥', color: 'orange', name: 'Sub-Admin' },
  Shop: { icon: '🏪', color: 'grey', name: 'Shop' },
};

const recordFilterSchema = z.object({
  tableName: z.string(),
  recordId: z.string(),
});

// GET /api/admin/audit-logs/record?tableName=Repair&recordId=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('tableName');
    const recordId = searchParams.get('recordId');

    if (!tableName || !recordId) {
      return NextResponse.json(
        { success: false, error: 'tableName and recordId are required' },
        { status: 400 }
      );
    }

    const validation = recordFilterSchema.safeParse({ tableName, recordId });
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    const result = await withAdminContext(adminId, async (db) => {
      const logs = await db.auditLog.findMany({
        where: {
          adminId,
          tableName: validation.data.tableName,
          recordId: validation.data.recordId,
        },
        orderBy: { createdAt: 'desc' },
      });

      const config = TABLE_DISPLAY_CONFIG[validation.data.tableName] || { icon: '📋', color: 'grey', name: validation.data.tableName };

      return { logs, config };
    });

    return NextResponse.json({
      success: true,
      tableName: validation.data.tableName,
      recordId: validation.data.recordId,
      logs: result.logs.map((log) => ({
        ...log,
        icon: result.config.icon,
        color: result.config.color,
        moduleName: result.config.name,
      })),
    });
  } catch (error) {
    logger.error('Error fetching audit log record', { error });
    return NextResponse.json({ success: false, error: 'Failed to fetch audit log' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';