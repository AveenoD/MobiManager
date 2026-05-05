import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from '@/lib/jwt';
import { withAdminContext } from '@/lib/db';
import logger from '@/lib/logger';
import { getActorFromPayload } from '@/lib/auth';
import {
  actorToUserRef,
  ensureNotificationsTables,
  type NotificationAudience,
  type NotificationSeverity,
  type NotificationType,
  type NotificationUserType,
} from '@/lib/services/notifications/storage';
import { resolveRecipients, upsertReceipts } from '@/lib/services/notifications/recipients';

export const dynamic = 'force-dynamic';

function requireAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  if (!token) return null;
  return token;
}

export async function GET(request: NextRequest) {
  try {
    await ensureNotificationsTables();

    const token = requireAdminToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;
    const { userType, userId } = actorToUserRef(actor);

    const sp = request.nextUrl.searchParams;
    const unreadOnly = sp.get('unreadOnly') === '1';
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit') || 30)));
    const cursor = sp.get('cursor'); // createdAt ISO, optional

    const rows = await withAdminContext(adminId, async (db) => {
      const whereUnread = unreadOnly ? `AND r."readAt" IS NULL` : '';
      const whereCursor = cursor ? `AND n."createdAt" < '${cursor}'::timestamptz` : '';

      return db.$queryRawUnsafe<
        Array<{
          id: string;
          type: string;
          severity: string;
          title: string;
          message: string;
          actionUrl: string | null;
          data: any;
          createdAt: string;
          expiresAt: string | null;
          readAt: string | null;
          dismissedAt: string | null;
          createdByType: string;
        }>
      >(`
        SELECT
          n."id",
          n."type",
          n."severity",
          n."title",
          n."message",
          n."actionUrl",
          n."data",
          n."createdAt",
          n."expiresAt",
          n."createdByType",
          r."readAt",
          r."dismissedAt"
        FROM "NotificationReceipt" r
        JOIN "Notification" n ON n."id" = r."notificationId"
        WHERE r."adminId" = '${adminId}'::uuid
          AND r."userType" = '${userType}'
          AND r."userId" = '${userId}'::uuid
          AND r."dismissedAt" IS NULL
          ${whereUnread}
          ${whereCursor}
          AND (n."expiresAt" IS NULL OR n."expiresAt" > NOW())
        ORDER BY n."createdAt" DESC
        LIMIT ${limit};
      `);
    });

    const nextCursor = rows.length > 0 ? rows[rows.length - 1].createdAt : null;

    return NextResponse.json({ success: true, notifications: rows, nextCursor });
  } catch (error) {
    logger.error('Error fetching notifications', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureNotificationsTables();

    const token = requireAdminToken(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token);
    const actor = getActorFromPayload(payload as any);
    const adminId = actor.adminId;

    const body = await request.json();

    const audience = String(body.audience || 'ADMIN_ONLY') as NotificationAudience;
    const type = String(body.type || 'MANUAL') as NotificationType;
    const severity = String(body.severity || 'INFO') as NotificationSeverity;
    const title = String(body.title || '').trim();
    const message = String(body.message || '').trim();
    const actionUrl = body.actionUrl ? String(body.actionUrl) : null;
    const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;
    const shopId = body.shopId ? String(body.shopId) : null;
    const targetUserType = body.targetUserType ? (String(body.targetUserType) as NotificationUserType) : null;
    const targetUserId = body.targetUserId ? String(body.targetUserId) : null;

    if (!title || title.length < 2) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (!message || message.length < 2) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    const created = await withAdminContext(adminId, async (db) => {
      const inserted = await db.$queryRawUnsafe<Array<{ id: string }>>(`
        INSERT INTO "Notification"
          ("adminId","audience","shopId","targetUserType","targetUserId","type","severity","title","message","actionUrl","data","dedupeKey","createdByType","createdById","expiresAt")
        VALUES
          ('${adminId}'::uuid, '${audience}', ${shopId ? `'${shopId}'::uuid` : 'NULL'}, ${targetUserType ? `'${targetUserType}'` : 'NULL'}, ${targetUserId ? `'${targetUserId}'::uuid` : 'NULL'},
           '${type}', '${severity}', ${sqlString(title)}, ${sqlString(message)}, ${actionUrl ? sqlString(actionUrl) : 'NULL'},
           ${body.data ? sqlJson(body.data) : 'NULL'}, NULL, '${actor.type}', ${actor.type === 'SUB_ADMIN' ? `'${actor.subAdminId}'::uuid` : `'${adminId}'::uuid`},
           ${expiresAt ? `'${expiresAt.toISOString()}'::timestamptz` : 'NULL'})
        RETURNING "id";
      `);

      return inserted[0];
    });

    const recipients = await resolveRecipients({
      adminId,
      audience,
      shopId,
      targetUserType,
      targetUserId,
    });

    await upsertReceipts({ notificationId: created.id, adminId, recipients });

    return NextResponse.json({ success: true, id: created.id });
  } catch (error) {
    logger.error('Error creating notification', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

function sqlString(v: string) {
  return `'${v.replaceAll("'", "''")}'`;
}

function sqlJson(v: any) {
  const s = JSON.stringify(v);
  return `'${s.replaceAll("'", "''")}'::jsonb`;
}

