import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import logger from '@/lib/logger';
import { ensureNotificationsTables } from '@/lib/services/notifications/storage';
import { resolveRecipients, upsertReceipts } from '@/lib/services/notifications/recipients';

export const dynamic = 'force-dynamic';

function internalAuthOk(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_JOBS_TOKEN;
  if (!secret) return false;
  const token = req.headers.get('x-internal-token');
  return token === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!internalAuthOk(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureNotificationsTables();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const subs = await prisma.subscription.findMany({
      where: { isCurrent: true },
      select: {
        adminId: true,
        endDate: true,
        planId: true,
      },
    });

    let createdCount = 0;
    for (const s of subs) {
      const end = new Date(s.endDate);
      const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Notify on key days (7,3,1,0) and after expiry (-1)
      const should =
        daysLeft === 7 || daysLeft === 3 || daysLeft === 1 || daysLeft === 0 || daysLeft === -1;
      if (!should) continue;

      const dedupeKey = `plan-expiry:${today.toISOString().slice(0, 10)}:${daysLeft}`;
      const severity = daysLeft <= 0 ? 'CRITICAL' : 'WARNING';
      const title =
        daysLeft > 1
          ? `Plan expiring in ${daysLeft} days`
          : daysLeft === 1
            ? 'Plan expiring tomorrow'
            : daysLeft === 0
              ? 'Plan expires today'
              : 'Plan expired';

      const message =
        daysLeft <= 0
          ? 'Your plan has expired. Please renew to avoid interruption.'
          : 'Please renew your plan to avoid interruption.';

      const inserted = await prisma
        .$queryRawUnsafe<Array<{ id: string }>>(`
          INSERT INTO "Notification"
            ("adminId","audience","type","severity","title","message","actionUrl","data","dedupeKey","createdByType","createdById")
          VALUES
            ('${s.adminId}'::uuid, 'ADMIN_ONLY', 'PLAN_EXPIRY', '${severity}',
             '${title.replaceAll("'", "''")}', '${message.replaceAll("'", "''")}', '/settings/billing',
             '${JSON.stringify({ planId: s.planId, endDate: end.toISOString(), daysLeft }).replaceAll("'", "''")}'::jsonb,
             '${dedupeKey.replaceAll("'", "''")}', 'SYSTEM', NULL)
          ON CONFLICT ("adminId","dedupeKey") DO NOTHING
          RETURNING "id";
        `);

      const id = inserted[0]?.id;
      if (!id) continue;

      const recipients = await resolveRecipients({
        adminId: s.adminId,
        audience: 'ADMIN_ONLY',
      });
      await upsertReceipts({ notificationId: id, adminId: s.adminId, recipients });
      createdCount++;
    }

    return NextResponse.json({ success: true, createdCount });
  } catch (error) {
    logger.error('Daily notifications job failed', { error });
    return NextResponse.json(
      { success: false, error: 'Job failed' },
      { status: 500 }
    );
  }
}

