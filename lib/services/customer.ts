/**
 * Customer service — findOrCreate, search, and summary helpers.
 * All functions require the caller to wrap queries in withAdminContext(adminId, ...).
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { normalizePhone } from '../phone';
import { getRedis } from '../redis';
import { flags } from '../featureFlags';

/** pg_trgm similarity floor for `search` vs Latin/Devanagari query (S5). */
const CROSS_SCRIPT_SIM_MIN = 0.11;

export interface FindOrCreateResult {
  customer: {
    id: string;
    phoneE164: string;
    name: string | null;
    notes: string | null;
    createdAt: Date;
  };
  created: boolean;
}

/**
 * Normalize a phone string and find or create a Customer record.
 * If `name` is provided and the customer already exists with a different name,
 * the name is NOT updated (avoiding accidental overwrites).
 *
 * @returns The customer record and whether it was newly created.
 */
export async function findOrCreateCustomer(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  phoneInput: string,
  name?: string
): Promise<FindOrCreateResult> {
  const normalized = normalizePhone(phoneInput);
  if (!normalized) {
    throw new CustomerValidationError('Invalid phone number format');
  }

  const { e164 } = normalized;

  const existing = await db.customer.findUnique({
    where: { adminId_phoneE164: { adminId, phoneE164: e164 } },
  });

  if (existing) {
    return { customer: existing, created: false };
  }

  const customer = await db.customer.create({
    data: {
      adminId,
      phoneE164: e164,
      name: name ?? null,
    },
  });

  return { customer, created: true };
}

/**
 * Search customers by phone (exact or partial) or name.
 *
 * Partial phone search uses the last 6 digits for fast index usage.
 * Results are ordered by most recent first.
 *
 * @param partialMatch - When true, matches last 6 digits of phone.
 *                       When false (default), requires exact E.164 match.
 */
async function searchCustomersCrossScript(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  opts: {
    phone?: string;
    nameQuery: string;
    partialMatch: boolean;
    limit: number;
  }
): Promise<
  Array<{
    id: string;
    phoneE164: string;
    name: string | null;
    notes: string | null;
    createdAt: Date;
  }>
> {
  const { phone, nameQuery, partialMatch, limit } = opts;
  const qnorm = nameQuery.toLowerCase();

  let phoneSql: Prisma.Sql = Prisma.empty;
  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return [];
    if (partialMatch) {
      const digits6 = phone.replace(/\D/g, '').slice(-6);
      phoneSql = Prisma.sql`AND c."phoneE164" LIKE ${`%${digits6}%`}`;
    } else {
      phoneSql = Prisma.sql`AND c."phoneE164" = ${normalized.e164}`;
    }
  }

  return db.$queryRaw<
    Array<{
      id: string;
      phoneE164: string;
      name: string | null;
      notes: string | null;
      createdAt: Date;
    }>
  >(Prisma.sql`
    SELECT c.id, c."phoneE164", c.name, c.notes, c."createdAt"
    FROM "Customer" c
    WHERE c."adminId" = ${adminId}
    ${phoneSql}
    AND (
      c.search % ${qnorm}
      OR similarity(c.search, ${qnorm}) > ${CROSS_SCRIPT_SIM_MIN}
      OR word_similarity(${qnorm}, c.search) > 0.42
      OR similarity(c.search, lower(trim(public.tx_to_latn(${qnorm})))) > ${CROSS_SCRIPT_SIM_MIN}
      OR c.search % lower(trim(public.tx_to_latn(${qnorm})))
    )
    ORDER BY GREATEST(
      similarity(c.search, ${qnorm}),
      word_similarity(${qnorm}, c.search),
      similarity(c.search, lower(trim(public.tx_to_latn(${qnorm}))))
    ) DESC NULLS LAST,
    c."createdAt" DESC
    LIMIT ${limit}
  `);
}

export async function searchCustomers(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  opts: {
    phone?: string;
    name?: string;
    partialMatch?: boolean;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  phoneE164: string;
  name: string | null;
  notes: string | null;
  createdAt: Date;
}>> {
  const { phone, name, partialMatch = false, limit = 20 } = opts;
  const nameTrim = name?.trim() || undefined;

  if (!phone && !nameTrim) return [];

  if (flags.crossScriptSearch && nameTrim) {
    return searchCustomersCrossScript(db, adminId, {
      phone,
      nameQuery: nameTrim,
      partialMatch,
      limit,
    });
  }

  const where: Prisma.CustomerWhereInput = { adminId };

  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return []; // invalid input = no results

    if (partialMatch) {
      // Use the last 6 local digits for partial search
      const digits6 = phone.replace(/\D/g, '').slice(-6);
      where.phoneE164 = { contains: digits6 };
    } else {
      where.phoneE164 = normalized.e164;
    }
  }

  if (nameTrim) {
    where.name = { contains: nameTrim, mode: 'insensitive' };
  }

  return db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      phoneE164: true,
      name: true,
      notes: true,
      createdAt: true,
    },
  });
}

export interface CustomerSummary {
  customer: {
    id: string;
    phoneE164: string;
    name: string | null;
    createdAt: Date;
  };
  sales: {
    totalCount: number;
    totalAmount: number;
    lastSaleDate: Date | null;
  };
  repairs: {
    totalCount: number;
    pendingCount: number;
    lastRepairDate: Date | null;
  };
  recharges: {
    totalCount: number;
    totalCommission: number;
    lastRechargeDate: Date | null;
  };
}

/**
 * Returns aggregated summary of a customer's activity.
 */
export async function getCustomerSummary(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  customerId: string
): Promise<CustomerSummary | null> {
  // Verify customer belongs to this admin
  const customer = await db.customer.findFirst({
    where: { id: customerId, adminId },
    select: { id: true, phoneE164: true, name: true, createdAt: true },
  });

  if (!customer) return null;

  const [salesAgg, repairsAgg, rechargesAgg] = await Promise.all([
    db.sale.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { saleDate: true },
    }),
    db.repair.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _max: { receivedDate: true },
    }),
    db.rechargeTransfer.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _sum: { commissionEarned: true },
      _max: { transactionDate: true },
    }),
  ]);

  // Pending repairs = not DELIVERED or CANCELLED
  const pendingRepairs = await db.repair.count({
    where: {
      customerId,
      adminId,
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
  });

  return {
    customer,
    sales: {
      totalCount: salesAgg._count.id,
      totalAmount: Number(salesAgg._sum.totalAmount ?? 0),
      lastSaleDate: salesAgg._max.saleDate ?? null,
    },
    repairs: {
      totalCount: repairsAgg._count.id,
      pendingCount: pendingRepairs,
      lastRepairDate: repairsAgg._max.receivedDate ?? null,
    },
    recharges: {
      totalCount: rechargesAgg._count.id,
      totalCommission: Number(rechargesAgg._sum.commissionEarned ?? 0),
      lastRechargeDate: rechargesAgg._max.transactionDate ?? null,
    },
  };
}

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerValidationError';
  }
}

// ── Customer recall (S2) — Redis cache + pg_trgm fuzzy fallback ─────────────

const CACHE_HIT_PREFIX = 'cust:';
const CACHE_MISS_SUFFIX = ':miss';
const CACHE_POSITIVE_TTL_SEC = 24 * 60 * 60;
const CACHE_NEGATIVE_TTL_SEC = 60;

const recallInflight = new Map<string, Promise<RecallExactPayload | null>>();

export function recallCacheHitKey(adminId: string, e164: string): string {
  return `${CACHE_HIT_PREFIX}${adminId}:phone:${e164}`;
}

export function recallCacheMissKey(adminId: string, e164: string): string {
  return `${CACHE_HIT_PREFIX}${adminId}:phone:${e164}${CACHE_MISS_SUFFIX}`;
}

export type LastTxRow = {
  kind: 'SALE' | 'REPAIR' | 'RECHARGE';
  at: string;
  ref: string | null;
  amount: number | null;
};

export type RecallExactPayload = {
  matchType: 'exact';
  id: string;
  name: string | null;
  phoneE164: string;
  languagePref: string | null;
  address: null;
  lastTx: LastTxRow[];
  score: number;
};

export type RecallFuzzyPayload = {
  matchType: 'fuzzy';
  candidates: Array<{
    id: string;
    name: string | null;
    phoneE164: string;
    score: number;
  }>;
};

export type RecallOutcome =
  | { kind: 'exact'; data: RecallExactPayload }
  | { kind: 'fuzzy'; data: RecallFuzzyPayload }
  | { kind: 'none' };

function getOrCreateInflight(
  key: string,
  factory: () => Promise<RecallExactPayload | null>
): Promise<RecallExactPayload | null> {
  const existing = recallInflight.get(key);
  if (existing) return existing;
  const p = factory().finally(() => {
    recallInflight.delete(key);
  });
  recallInflight.set(key, p);
  return p;
}

async function fetchLastTransactions(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  customerId: string
): Promise<LastTxRow[]> {
  const [sales, repairs, recharges] = await Promise.all([
    db.sale.findMany({
      where: { customerId, adminId },
      orderBy: { saleDate: 'desc' },
      take: 3,
      select: { saleNumber: true, saleDate: true, totalAmount: true },
    }),
    db.repair.findMany({
      where: { customerId, adminId },
      orderBy: { receivedDate: 'desc' },
      take: 3,
      select: { repairNumber: true, receivedDate: true, customerCharge: true },
    }),
    db.rechargeTransfer.findMany({
      where: { customerId, adminId },
      orderBy: { transactionDate: 'desc' },
      take: 3,
      select: { transactionRef: true, transactionDate: true, amount: true },
    }),
  ]);

  const merged: LastTxRow[] = [
    ...sales.map((s) => ({
      kind: 'SALE' as const,
      at: s.saleDate.toISOString(),
      ref: s.saleNumber,
      amount: Number(s.totalAmount),
    })),
    ...repairs.map((r) => ({
      kind: 'REPAIR' as const,
      at: r.receivedDate.toISOString(),
      ref: r.repairNumber,
      amount: Number(r.customerCharge),
    })),
    ...recharges.map((c) => ({
      kind: 'RECHARGE' as const,
      at: c.transactionDate.toISOString(),
      ref: c.transactionRef ?? null,
      amount: Number(c.amount),
    })),
  ];

  merged.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return merged.slice(0, 3);
}

async function loadExactPayload(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  phoneE164: string
): Promise<RecallExactPayload | null> {
  const row = await db.customer.findUnique({
    where: { adminId_phoneE164: { adminId, phoneE164 } },
    select: { id: true, name: true, phoneE164: true, languagePref: true },
  });
  if (!row) return null;

  const lastTx = await fetchLastTransactions(db, adminId, row.id);

  return {
    matchType: 'exact',
    id: row.id,
    name: row.name,
    phoneE164: row.phoneE164,
    languagePref: row.languagePref ?? null,
    address: null,
    lastTx,
    score: 1,
  };
}

async function readExactFromCache(
  adminId: string,
  e164: string,
  useCache: boolean
): Promise<RecallExactPayload | 'miss' | 'absent'> {
  if (!useCache) return 'absent';
  const r = getRedis();
  if (!r) return 'absent';

  try {
    const missKey = recallCacheMissKey(adminId, e164);
    const miss = await r.get(missKey);
    if (miss) return 'miss';

    const hitKey = recallCacheHitKey(adminId, e164);
    const hit = await r.get(hitKey);
    if (hit) {
      try {
        return JSON.parse(hit) as RecallExactPayload;
      } catch {
        return 'absent';
      }
    }
  } catch {
    return 'absent';
  }

  return 'absent';
}

async function writeExactToCache(
  adminId: string,
  e164: string,
  useCache: boolean,
  payload: RecallExactPayload | null
): Promise<void> {
  if (!useCache) return;
  const r = getRedis();
  if (!r) return;

  const hitKey = recallCacheHitKey(adminId, e164);
  const missKey = recallCacheMissKey(adminId, e164);

  try {
    if (!payload) {
      await r.set(missKey, '1', 'EX', CACHE_NEGATIVE_TTL_SEC);
      await r.del(hitKey);
    } else {
      await r.set(hitKey, JSON.stringify(payload), 'EX', CACHE_POSITIVE_TTL_SEC);
      await r.del(missKey);
    }
  } catch {
    /* degrade to DB-only */
  }
}

async function loadExactWithInflight(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  e164: string,
  useCache: boolean
): Promise<RecallExactPayload | null> {
  const inflightKey = `recall:${adminId}:${e164}`;
  return getOrCreateInflight(inflightKey, async () => {
    const row = await loadExactPayload(db, adminId, e164);
    await writeExactToCache(adminId, e164, useCache, row);
    return row;
  });
}

async function fuzzyCandidates(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  pattern: string
): Promise<RecallFuzzyPayload['candidates']> {
  try {
    const rows = await db.$queryRaw<
      Array<{ id: string; phoneE164: string; name: string | null; score: number }>
    >`
      SELECT c.id, c."phoneE164", c.name,
             similarity(c."phoneE164", ${pattern}::text) AS score
      FROM "Customer" c
      WHERE c."adminId" = ${adminId}
        AND c."phoneE164" % ${pattern}::text
      ORDER BY score DESC NULLS LAST
      LIMIT 5
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      phoneE164: r.phoneE164,
      score: Number(r.score),
    }));
  } catch {
    return [];
  }
}

/**
 * Phone recall: exact E.164 match (with optional Redis cache) or fuzzy top-5 via pg_trgm.
 * Caller must run inside `withAdminContext(adminId, ...)`.
 *
 * @param useCache — when true and `flags.customerRecall`, Redis read-through cache is used.
 */
export async function recallCustomerByPhone(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  phoneQuery: string,
  useCache: boolean
): Promise<RecallOutcome> {
  const trimmed = phoneQuery.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normalized = normalizePhone(trimmed);

  if (normalized) {
    const e164 = normalized.e164;

    const cached = await readExactFromCache(adminId, e164, useCache);
    if (cached !== 'absent' && cached !== 'miss') {
      return { kind: 'exact', data: cached };
    }
    if (cached === 'miss') {
      if (digits.length >= 6) {
        const fuzzy = await fuzzyCandidates(db, adminId, e164);
        if (fuzzy.length) return { kind: 'fuzzy', data: { matchType: 'fuzzy', candidates: fuzzy } };
      }
      return { kind: 'none' };
    }

    const exact = await loadExactWithInflight(db, adminId, e164, useCache);
    if (exact) return { kind: 'exact', data: exact };

    if (digits.length >= 6) {
      const fuzzy = await fuzzyCandidates(db, adminId, e164);
      if (fuzzy.length) return { kind: 'fuzzy', data: { matchType: 'fuzzy', candidates: fuzzy } };
    }
    return { kind: 'none' };
  }

  if (digits.length >= 6) {
    const guess =
      digits.length >= 10 && /^[6-9]/.test(digits.slice(-10))
        ? `+91${digits.slice(-10)}`
        : digits;
    const fuzzy = await fuzzyCandidates(db, adminId, guess);
    if (fuzzy.length) return { kind: 'fuzzy', data: { matchType: 'fuzzy', candidates: fuzzy } };
  }

  throw new CustomerValidationError('Invalid phone number');
}
