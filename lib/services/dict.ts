/**
 * Per-tenant learning dictionaries (S3).
 * All DB access must run inside `withAdminContext(adminId, ...)`.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { DictKind } from '@/lib/validations/dict.schema';

export type DictRow = {
  id: string;
  value: string;
  valueLatn: string;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
};

/** Latin-folded search helper until S5 `tx_to_latn` in SQL. */
export function deriveValueLatn(value: string): string {
  const trimmed = value.trim();
  const ascii = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (ascii.length > 0) return ascii;
  return trimmed.toLowerCase();
}

/** Ranking: useCount × exp(−days_since_last_use / 30) — blueprint §6.5 */
export function dictRankScore(useCount: number, lastUsedAt: Date | null, createdAt: Date): number {
  const ref = lastUsedAt ?? createdAt;
  const days = Math.max(0, (Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
  return useCount * Math.exp(-days / 30);
}

function rowFrom(r: {
  id: string;
  value: string;
  valueLatn: string;
  useCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}): DictRow {
  return {
    id: r.id,
    value: r.value,
    valueLatn: r.valueLatn,
    useCount: r.useCount,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

async function findIdByNorm(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  kind: DictKind,
  trimmed: string
): Promise<string | null> {
  switch (kind) {
    case 'brand': {
      const r = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "BrandDict"
        WHERE "adminId" = ${adminId} AND lower(trim("value")) = lower(trim(${trimmed}::text))
        LIMIT 1`;
      return r[0]?.id ?? null;
    }
    case 'model': {
      const r = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "ModelDict"
        WHERE "adminId" = ${adminId} AND lower(trim("value")) = lower(trim(${trimmed}::text))
        LIMIT 1`;
      return r[0]?.id ?? null;
    }
    case 'category': {
      const r = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "CategoryDict"
        WHERE "adminId" = ${adminId} AND lower(trim("value")) = lower(trim(${trimmed}::text))
        LIMIT 1`;
      return r[0]?.id ?? null;
    }
    case 'issue': {
      const r = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "IssueDict"
        WHERE "adminId" = ${adminId} AND lower(trim("value")) = lower(trim(${trimmed}::text))
        LIMIT 1`;
      return r[0]?.id ?? null;
    }
    case 'operator': {
      const r = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "OperatorDict"
        WHERE "adminId" = ${adminId} AND lower(trim("value")) = lower(trim(${trimmed}::text))
        LIMIT 1`;
      return r[0]?.id ?? null;
    }
    default:
      return null;
  }
}

async function findRowById(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  kind: DictKind,
  id: string
): Promise<DictRow | null> {
  const select = {
    id: true,
    value: true,
    valueLatn: true,
    useCount: true,
    lastUsedAt: true,
    createdAt: true,
  } as const;
  switch (kind) {
    case 'brand': {
      const r = await db.brandDict.findFirst({ where: { id, adminId }, select });
      return r ? rowFrom(r) : null;
    }
    case 'model': {
      const r = await db.modelDict.findFirst({ where: { id, adminId }, select });
      return r ? rowFrom(r) : null;
    }
    case 'category': {
      const r = await db.categoryDict.findFirst({ where: { id, adminId }, select });
      return r ? rowFrom(r) : null;
    }
    case 'issue': {
      const r = await db.issueDict.findFirst({ where: { id, adminId }, select });
      return r ? rowFrom(r) : null;
    }
    case 'operator': {
      const r = await db.operatorDict.findFirst({ where: { id, adminId }, select });
      return r ? rowFrom(r) : null;
    }
    default:
      return null;
  }
}

type DictSelectRow = {
  id: string;
  value: string;
  valueLatn: string;
  useCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
};

function rankAndSlice(rows: DictSelectRow[], limit: number): DictRow[] {
  const scored = rows.map((r) => ({
    r,
    score: dictRankScore(r.useCount, r.lastUsedAt, r.createdAt),
  }));
  scored.sort((a, b) => b.score - a.score || b.r.useCount - a.r.useCount);
  return scored.slice(0, limit).map(({ r }) => rowFrom(r));
}

export async function searchDict(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  kind: DictKind,
  q: string,
  limit: number
): Promise<DictRow[]> {
  const ql = q.trim().toLowerCase();
  const take = Math.min(120, Math.max(limit * 15, limit));
  const select = { id: true, value: true, valueLatn: true, useCount: true, lastUsedAt: true, createdAt: true } as const;

  const withSearch = {
    adminId,
    OR: [
      { value: { contains: q, mode: 'insensitive' as const } },
      { valueLatn: { contains: ql, mode: 'insensitive' as const } },
    ],
  };
  const adminOnly = { adminId };

  switch (kind) {
    case 'brand':
      return rankAndSlice(
        await db.brandDict.findMany({
          where: ql.length ? withSearch : adminOnly,
          take,
          select,
        }),
        limit
      );
    case 'model':
      return rankAndSlice(
        await db.modelDict.findMany({
          where: ql.length ? withSearch : adminOnly,
          take,
          select,
        }),
        limit
      );
    case 'category':
      return rankAndSlice(
        await db.categoryDict.findMany({
          where: ql.length ? withSearch : adminOnly,
          take,
          select,
        }),
        limit
      );
    case 'issue':
      return rankAndSlice(
        await db.issueDict.findMany({
          where: ql.length ? withSearch : adminOnly,
          take,
          select,
        }),
        limit
      );
    case 'operator':
      return rankAndSlice(
        await db.operatorDict.findMany({
          where: ql.length ? withSearch : adminOnly,
          take,
          select,
        }),
        limit
      );
    default:
      return [];
  }
}

export async function upsertDictValue(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  kind: DictKind,
  value: string,
  createdBy: string | null
): Promise<DictRow> {
  const trimmed = value.trim();
  const valueLatn = deriveValueLatn(trimmed);

  const existingId = await findIdByNorm(db, adminId, kind, trimmed);
  if (existingId) {
    const row = await findRowById(db, adminId, kind, existingId);
    if (row) return row;
  }

  const data = { adminId, value: trimmed, valueLatn, createdBy };
  const select = { id: true, value: true, valueLatn: true, useCount: true, lastUsedAt: true, createdAt: true } as const;

  switch (kind) {
    case 'brand': {
      const r = await db.brandDict.create({ data, select });
      return rowFrom(r);
    }
    case 'model': {
      const r = await db.modelDict.create({ data, select });
      return rowFrom(r);
    }
    case 'category': {
      const r = await db.categoryDict.create({ data, select });
      return rowFrom(r);
    }
    case 'issue': {
      const r = await db.issueDict.create({ data, select });
      return rowFrom(r);
    }
    case 'operator': {
      const r = await db.operatorDict.create({ data, select });
      return rowFrom(r);
    }
    default:
      throw new Error('invalid dict kind');
  }
}

export async function touchDictEntry(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  kind: DictKind,
  id: string
): Promise<boolean> {
  let n = 0;
  switch (kind) {
    case 'brand':
      n = await db.$executeRaw`
        UPDATE "BrandDict" SET "useCount" = "useCount" + 1, "lastUsedAt" = now(), "updatedAt" = now()
        WHERE id = ${id} AND "adminId" = ${adminId}`;
      break;
    case 'model':
      n = await db.$executeRaw`
        UPDATE "ModelDict" SET "useCount" = "useCount" + 1, "lastUsedAt" = now(), "updatedAt" = now()
        WHERE id = ${id} AND "adminId" = ${adminId}`;
      break;
    case 'category':
      n = await db.$executeRaw`
        UPDATE "CategoryDict" SET "useCount" = "useCount" + 1, "lastUsedAt" = now(), "updatedAt" = now()
        WHERE id = ${id} AND "adminId" = ${adminId}`;
      break;
    case 'issue':
      n = await db.$executeRaw`
        UPDATE "IssueDict" SET "useCount" = "useCount" + 1, "lastUsedAt" = now(), "updatedAt" = now()
        WHERE id = ${id} AND "adminId" = ${adminId}`;
      break;
    case 'operator':
      n = await db.$executeRaw`
        UPDATE "OperatorDict" SET "useCount" = "useCount" + 1, "lastUsedAt" = now(), "updatedAt" = now()
        WHERE id = ${id} AND "adminId" = ${adminId}`;
      break;
    default:
      return false;
  }
  return Number(n) > 0;
}
