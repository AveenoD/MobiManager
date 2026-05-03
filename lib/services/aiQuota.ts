import { Prisma, PrismaClient } from '@prisma/client';
import { MODULE_KEYS, ModuleKey, assertModuleEnabled } from '../modules';
import { flags } from '../featureFlags';

export type AIQuotaCategory =
  | 'OCR_EXTRACT'
  | 'FESTIVAL_OFFERS'
  | 'SLOW_STOCK'
  | 'MONTHLY_STRATEGY'
  | 'LANGUAGE_ASSIST';

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function dayBucketUTC(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function getPackDailyLimits(packKey: ModuleKey): Record<AIQuotaCategory, number> {
  switch (packKey) {
    case MODULE_KEYS.AI_PACK_BASIC:
      return {
        OCR_EXTRACT: 50,
        FESTIVAL_OFFERS: 5,
        SLOW_STOCK: 2,
        MONTHLY_STRATEGY: 0,
        LANGUAGE_ASSIST: 20,
      };
    case MODULE_KEYS.AI_PACK_STANDARD:
      return {
        OCR_EXTRACT: 50,
        FESTIVAL_OFFERS: 5,
        SLOW_STOCK: 5,
        MONTHLY_STRATEGY: 0,
        LANGUAGE_ASSIST: 40,
      };
    case MODULE_KEYS.AI_PACK_PRO:
      return {
        OCR_EXTRACT: 80,
        FESTIVAL_OFFERS: 8,
        SLOW_STOCK: 8,
        MONTHLY_STRATEGY: 2,
        LANGUAGE_ASSIST: 60,
      };
    default:
      return {
        OCR_EXTRACT: 0,
        FESTIVAL_OFFERS: 0,
        SLOW_STOCK: 0,
        MONTHLY_STRATEGY: 0,
        LANGUAGE_ASSIST: 0,
      };
  }
}

async function resolveActiveAiPack(adminId: string): Promise<ModuleKey | null> {
  // Prefer PRO > STANDARD > BASIC
  for (const k of [MODULE_KEYS.AI_PACK_PRO, MODULE_KEYS.AI_PACK_STANDARD, MODULE_KEYS.AI_PACK_BASIC] as const) {
    const enabled = await (await import('../modules')).isModuleEnabled(adminId, k);
    if (enabled) return k;
  }
  return null;
}

export async function assertAiAccess(adminId: string) {
  const pack = await resolveActiveAiPack(adminId);
  if (!pack) {
    // Return a stable 403 response shape using module enforcement helpers.
    return await assertModuleEnabled(adminId, MODULE_KEYS.AI_PACK_BASIC);
  }
  return null;
}

export async function checkAiQuota(db: PrismaClient, adminId: string, category: AIQuotaCategory): Promise<QuotaResult> {
  const pack = await resolveActiveAiPack(adminId);
  const baseLimit = pack ? getPackDailyLimits(pack)[category] : 0;

  const bucket = dayBucketUTC();

  const usedAgg = await db.aIConsumption.aggregate({
    where: { adminId, category: category as any, date: bucket },
    _sum: { count: true },
  });

  const used = usedAgg._sum.count ?? 0;

  // Top-ups only apply to OCR_EXTRACT and strategy buckets.
  let extraCredits = 0;
  if (category === 'OCR_EXTRACT') {
    const topups = await db.aITopUp.aggregate({
      where: { adminId, type: 'OCR' },
      _sum: { creditsPurchased: true, creditsUsed: true },
    });
    extraCredits = (topups._sum.creditsPurchased ?? 0) - (topups._sum.creditsUsed ?? 0);
  } else if (category === 'FESTIVAL_OFFERS' || category === 'SLOW_STOCK' || category === 'MONTHLY_STRATEGY') {
    const topups = await db.aITopUp.aggregate({
      where: { adminId, type: 'STRATEGY' },
      _sum: { creditsPurchased: true, creditsUsed: true },
    });
    extraCredits = (topups._sum.creditsPurchased ?? 0) - (topups._sum.creditsUsed ?? 0);
  }

  const limit = baseLimit + Math.max(0, extraCredits);
  const remaining = Math.max(0, limit - used);

  return { allowed: remaining > 0, remaining, limit };
}

/**
 * Under `flags.atomicEntitlement`, takes a transaction-scoped advisory lock so
 * check + increment cannot race with parallel requests for the same admin/category/day.
 */
export async function bookAiQuotaUnits(
  db: PrismaClient,
  adminId: string,
  category: AIQuotaCategory,
  amount = 1,
  metadata?: Prisma.InputJsonValue
): Promise<{ ok: true } | { ok: false; quota: QuotaResult }> {
  if (flags.atomicEntitlement) {
    const bucket = dayBucketUTC();
    const lockKey = `${adminId}\0${category}\0${bucket.toISOString().slice(0, 10)}`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
    const quota = await checkAiQuota(db, adminId, category);
    if (!quota.allowed) {
      return { ok: false, quota };
    }
  }

  await consumeAiQuota(db, adminId, category, amount, metadata);
  return { ok: true };
}

export async function consumeAiQuota(
  db: PrismaClient,
  adminId: string,
  category: AIQuotaCategory,
  amount = 1,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  const bucket = dayBucketUTC();

  await db.aIConsumption.upsert({
    where: { adminId_category_date: { adminId, category: category as any, date: bucket } },
    update: { count: { increment: amount }, metadata: metadata ?? undefined },
    create: { adminId, category: category as any, date: bucket, count: amount, metadata: metadata ?? undefined },
  });

  // If base limit is exceeded, consume top-up credits.
  const pack = await resolveActiveAiPack(adminId);
  const baseLimit = pack ? getPackDailyLimits(pack)[category] : 0;
  if (baseLimit <= 0) {
    // No base quota; usage must be covered entirely by top-ups (enforced by checkAiQuota()).
    // We still record consumption above.
    return;
  }

  const usedAgg = await db.aIConsumption.aggregate({
    where: { adminId, category: category as any, date: bucket },
    _sum: { count: true },
  });
  const used = usedAgg._sum.count ?? 0;

  const extraNeeded = Math.max(0, used - baseLimit);
  if (extraNeeded === 0) return;

  // Consume ONE credit from the earliest top-up that has remaining credits.
  // (We only consume per request in v1; if amount > 1, call consumeAiQuota repeatedly.)
  const type = category === 'OCR_EXTRACT' ? 'OCR' : 'STRATEGY';

  // Prisma doesn't support field-to-field comparisons in WHERE portably (creditsUsed < creditsPurchased),
  // so we fetch a small window and choose the earliest with remaining credits.
  const topups = await db.aITopUp.findMany({
    where: { adminId, type },
    orderBy: { purchasedAt: 'asc' },
    take: 25,
    select: { id: true, creditsPurchased: true, creditsUsed: true },
  });

  const topup = topups.find((t) => t.creditsUsed < t.creditsPurchased);
  if (!topup) return;

  await db.aITopUp.update({
    where: { id: topup.id },
    data: { creditsUsed: { increment: 1 } },
  });
}

