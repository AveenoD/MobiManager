/**
 * S7 — concurrent entitlement consumption (UPDATE … WHERE … RETURNING).
 * Enable: ENTITLEMENT_RACE_INTEGRATION=1 DATABASE_URL=... npm run test:int
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { consumeEntitlement } from '../../lib/services/entitlement';

const RUN = process.env.ENTITLEMENT_RACE_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('S7 entitlement race', () => {
  const prisma = new PrismaClient();
  const adminId = randomUUID();
  const moduleKey = `RACE_${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await prisma.admin.create({
      data: {
        id: adminId,
        shopName: 'Entitlement race',
        ownerName: 'Test',
        email: `ent-race-${randomUUID()}@example.com`,
        phone: `+9198${String(Date.now()).slice(-8)}`,
        passwordHash: 'x',
      },
    });
    await prisma.entitlement.create({
      data: {
        adminId,
        moduleKey,
        limitType: 'race',
        maxValue: 5,
        usedValue: 0,
      },
    });
  });

  afterAll(async () => {
    await prisma.entitlement.deleteMany({ where: { adminId, moduleKey } });
    await prisma.admin.delete({ where: { id: adminId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('allows exactly max concurrent consumes under contention', async () => {
    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        consumeEntitlement(prisma, {
          adminId,
          moduleKey,
          limitType: 'race',
          amount: 1,
        })
      )
    );

    const consumed = results.filter((r) => r.ok && r.mode === 'consumed').length;
    const rejected = results.filter((r) => !r.ok && r.reason === 'LIMIT_REACHED').length;

    expect(consumed).toBe(5);
    expect(rejected).toBe(95);

    const row = await prisma.entitlement.findUnique({
      where: { adminId_moduleKey: { adminId, moduleKey } },
      select: { usedValue: true, maxValue: true },
    });
    expect(row?.usedValue).toBe(5);
    expect(row?.maxValue).toBe(5);
  });
});
