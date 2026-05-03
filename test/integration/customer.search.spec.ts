/**
 * S5 cross-script customer search (pg_trgm + generated `search`).
 * Enable: S5_SEARCH_INTEGRATION=1 DATABASE_URL=... FEATURE_CROSS_SCRIPT_SEARCH=1 npm run test:int
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

const RUN =
  process.env.S5_SEARCH_INTEGRATION === '1' &&
  Boolean(process.env.DATABASE_URL) &&
  process.env.FEATURE_CROSS_SCRIPT_SEARCH === '1';

describe.skipIf(!RUN)('S5 customer.search integration', () => {
  const prisma = new PrismaClient();
  const adminId = `s5-search-test-${Date.now()}`;
  const phones = ['+919000000001', '+919000000002', '+919000000003'] as const;
  let searchCustomers: (typeof import('../../lib/services/customer'))['searchCustomers'];

  beforeAll(async () => {
    process.env.FEATURE_CROSS_SCRIPT_SEARCH = '1';
    vi.resetModules();
    ({ searchCustomers } = await import('../../lib/services/customer'));

    await prisma.admin.create({
      data: {
        id: adminId,
        shopName: 'S5 Search Test',
        ownerName: 'Test',
        email: `s5search-${Date.now()}@example.com`,
        phone: `+9199${String(Date.now()).slice(-8)}`,
        passwordHash: 'x',
      },
    });
    await prisma.customer.createMany({
      data: [
        { adminId, phoneE164: phones[0], name: 'Samsung' },
        { adminId, phoneE164: phones[1], name: 'सैमसंग' },
        { adminId, phoneE164: phones[2], name: 'सॅमसंग' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { adminId } });
    await prisma.admin.delete({ where: { id: adminId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('finds Devanagari and variant spellings when querying samsung', async () => {
    const { flags } = await import('../../lib/featureFlags');
    expect(flags.crossScriptSearch).toBe(true);

    const rows = await searchCustomers(prisma, adminId, {
      name: 'samsung',
      limit: 20,
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const names = rows.map((r) => r.name).filter(Boolean);
    expect(names.some((n) => n === 'Samsung')).toBe(true);
    expect(names.some((n) => n === 'सैमसंग')).toBe(true);
    expect(names.some((n) => n === 'सॅमसंग')).toBe(true);
  });

  it('finds Latin when querying Devanagari सैमसंग', async () => {
    const rows = await searchCustomers(prisma, adminId, {
      name: 'सैमसंग',
      limit: 20,
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('tx_to_latn is IMMUTABLE in PostgreSQL', async () => {
    const r = await prisma.$queryRaw<{ provolatile: string }[]>`
      SELECT p.provolatile::text AS provolatile
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'tx_to_latn'
      LIMIT 1
    `;
    expect(r[0]?.provolatile).toBe('i');
  });
});
