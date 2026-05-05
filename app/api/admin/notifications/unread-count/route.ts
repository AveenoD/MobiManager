import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { actorToUserRef, ensureNotificationsTables } from '@/lib/services/notifications/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await ensureNotificationsTables();

    const token = request.cookies.get('admin_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;
    const { userType, userId } = actorToUserRef(actor);

    const count = await withAdminContext(adminId, async (db) => {
      const rows = await db.$queryRawUnsafe<Array<{ c: number }>>(`
        SELECT COUNT(*)::int AS c
        FROM "NotificationReceipt" r
        JOIN "Notification" n ON n."id" = r."notificationId"
        WHERE r."adminId" = '${adminId}'::uuid
          AND r."userType" = '${userType}'
          AND r."userId" = '${userId}'::uuid
          AND r."dismissedAt" IS NULL
          AND r."readAt" IS NULL
          AND (n."expiresAt" IS NULL OR n."expiresAt" > NOW());
      `);
      return rows[0]?.c ?? 0;
    });

    return NextResponse.json({ success: true, unreadCount: count });
  } catch (error) {
    logger.error('Error fetching unread notification count', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}

