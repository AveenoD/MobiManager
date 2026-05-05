import { prisma } from '@/lib/db';

/**
 * Notifications storage is implemented with raw SQL so it can be deployed
 * even when the main Prisma schema is not fully migrated in a dev DB.
 *
 * The tables are created idempotently on demand.
 */

export type NotificationUserType = 'ADMIN' | 'SUB_ADMIN';

export type NotificationAudience =
  | 'ADMIN_ONLY'
  | 'ALL_STAFF'
  | 'SHOP'
  | 'USER';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type NotificationType =
  | 'MANUAL'
  | 'PLAN_EXPIRY'
  | 'BILLING'
  | 'INVENTORY'
  | 'REPAIR'
  | 'RECHARGE';

let ensured = false;

export async function ensureNotificationsTables(): Promise<void> {
  if (ensured) return;

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "adminId" uuid NOT NULL,
      "audience" text NOT NULL,
      "shopId" uuid NULL,
      "targetUserType" text NULL,
      "targetUserId" uuid NULL,
      "type" text NOT NULL,
      "severity" text NOT NULL DEFAULT 'INFO',
      "title" text NOT NULL,
      "message" text NOT NULL,
      "actionUrl" text NULL,
      "data" jsonb NULL,
      "dedupeKey" text NULL,
      "createdByType" text NOT NULL,
      "createdById" uuid NULL,
      "createdAt" timestamptz NOT NULL DEFAULT NOW(),
      "expiresAt" timestamptz NULL
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "Notification_adminId_dedupeKey_key"
      ON "Notification" ("adminId", "dedupeKey")
      WHERE "dedupeKey" IS NOT NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "Notification_adminId_createdAt_idx"
      ON "Notification" ("adminId", "createdAt" DESC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "NotificationReceipt" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "notificationId" uuid NOT NULL REFERENCES "Notification"("id") ON DELETE CASCADE,
      "adminId" uuid NOT NULL,
      "userType" text NOT NULL,
      "userId" uuid NOT NULL,
      "readAt" timestamptz NULL,
      "dismissedAt" timestamptz NULL,
      "createdAt" timestamptz NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "NotificationReceipt_notification_user_key"
      ON "NotificationReceipt" ("notificationId", "userType", "userId");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "NotificationReceipt_admin_user_unread_idx"
      ON "NotificationReceipt" ("adminId", "userType", "userId", "readAt")
      WHERE "dismissedAt" IS NULL;
  `);

  ensured = true;
}

export function actorToUserRef(actor: any): { userType: NotificationUserType; userId: string } {
  if (actor?.type === 'SUB_ADMIN') {
    return { userType: 'SUB_ADMIN', userId: actor.subAdminId };
  }
  return { userType: 'ADMIN', userId: actor.adminId };
}

