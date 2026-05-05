import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import { actorToUserRef, ensureNotificationsTables } from '@/lib/services/notifications/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
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

    const { notificationId } = await params;

    await withAdminContext(adminId, async (db) => {
      await db.$executeRawUnsafe(`
        UPDATE "NotificationReceipt"
        SET "readAt" = COALESCE("readAt", NOW())
        WHERE "adminId" = '${adminId}'::uuid
          AND "userType" = '${userType}'
          AND "userId" = '${userId}'::uuid
          AND "notificationId" = '${notificationId}'::uuid;
      `);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification read', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to mark read' },
      { status: 500 }
    );
  }
}

