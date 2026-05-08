import { prisma, withAdminContext } from '@/lib/db';
import type { NotificationAudience, NotificationUserType } from './storage';

export type Recipient = { userType: NotificationUserType; userId: string };

export async function resolveRecipients(params: {
  adminId: string;
  audience: NotificationAudience;
  shopId?: string | null;
  targetUserType?: NotificationUserType | null;
  targetUserId?: string | null;
}): Promise<Recipient[]> {
  const { adminId, audience } = params;

  const base: Recipient[] = [{ userType: 'ADMIN', userId: adminId }];

  if (audience === 'ADMIN_ONLY') return base;

  if (audience === 'USER') {
    if (!params.targetUserType || !params.targetUserId) return base;
    return [{ userType: params.targetUserType, userId: params.targetUserId }];
  }

  if (audience === 'SHOP') {
    const shopId = params.shopId;
    if (!shopId) return base;
    const subAdmins = await withAdminContext(adminId, (db) =>
      db.subAdmin.findMany({
        where: { adminId, shopId, isActive: true },
        select: { id: true },
      })
    );
    return [
      ...base,
      ...subAdmins.map((s) => ({ userType: 'SUB_ADMIN' as const, userId: s.id })),
    ];
  }

  // ALL_STAFF
  const subs = await withAdminContext(adminId, (db) =>
    db.subAdmin.findMany({
      where: { adminId, isActive: true },
      select: { id: true },
    })
  );

  return [
    ...base,
    ...subs.map((s) => ({ userType: 'SUB_ADMIN' as const, userId: s.id })),
  ];
}

export async function upsertReceipts(args: {
  notificationId: string;
  adminId: string;
  recipients: Recipient[];
}) {
  const { notificationId, adminId, recipients } = args;
  if (recipients.length === 0) return;

  // Create receipts idempotently.
  await prisma.$transaction(
    recipients.map((r) =>
      prisma.$executeRawUnsafe(`
        INSERT INTO "NotificationReceipt" ("notificationId","adminId","userType","userId")
        VALUES ('${notificationId}'::uuid, '${adminId}'::uuid, '${r.userType}', '${r.userId}'::uuid)
        ON CONFLICT ("notificationId","userType","userId") DO NOTHING;
      `)
    )
  );
}

