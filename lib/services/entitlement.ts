/**
 * S7 — atomic entitlement consumption (UPDATE … WHERE … RETURNING).
 * No row for (adminId, moduleKey) → treat as uncapped (ok, skipped).
 */

import type { Prisma } from '@prisma/client';

export type EntitlementDb = Prisma.TransactionClient | import('@prisma/client').PrismaClient;

export type ConsumeEntitlementResult =
  | { ok: true; mode: 'consumed'; usedValue: number; maxValue: number }
  | { ok: true; mode: 'unlimited' }
  | { ok: false; reason: 'LIMIT_REACHED' };

export class EntitlementLimitError extends Error {
  readonly code = 'LIMIT_REACHED' as const;

  constructor() {
    super('LIMIT_REACHED');
    this.name = 'EntitlementLimitError';
  }
}

export async function consumeEntitlement(
  db: EntitlementDb,
  params: { adminId: string; moduleKey: string; limitType: string; amount?: number }
): Promise<ConsumeEntitlementResult> {
  const amount = params.amount ?? 1;

  const updated = await db.$queryRaw<{ usedValue: number; maxValue: number }[]>`
    UPDATE "Entitlement"
    SET "usedValue" = "usedValue" + ${amount},
        "updatedAt" = NOW()
    WHERE "adminId" = ${params.adminId}::uuid
      AND "moduleKey" = ${params.moduleKey}
      AND "usedValue" + ${amount} <= "maxValue"
    RETURNING "usedValue", "maxValue"
  `;

  if (updated.length > 0) {
    return {
      ok: true,
      mode: 'consumed',
      usedValue: updated[0].usedValue,
      maxValue: updated[0].maxValue,
    };
  }

  const exists = await db.entitlement.findUnique({
    where: { adminId_moduleKey: { adminId: params.adminId, moduleKey: params.moduleKey } },
    select: { id: true },
  });

  if (!exists) {
    return { ok: true, mode: 'unlimited' };
  }

  return { ok: false, reason: 'LIMIT_REACHED' };
}

/** Throws {@link EntitlementLimitError} when a capped row is at limit. */
export async function assertConsumeEntitlement(
  db: EntitlementDb,
  params: { adminId: string; moduleKey: string; limitType: string; amount?: number }
): Promise<void> {
  const r = await consumeEntitlement(db, params);
  if (!r.ok) {
    throw new EntitlementLimitError();
  }
}
