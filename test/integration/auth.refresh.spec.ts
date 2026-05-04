/**
 * S8 — refresh token rotation + replay detection.
 * Enable: S8_REFRESH_INTEGRATION=1 DATABASE_URL=... npm run test:int
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  persistRefreshToken,
  consumeRefreshAndRotate,
  newRefreshRaw,
} from '../../lib/services/refreshToken';

const RUN = process.env.S8_REFRESH_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('S8 auth refresh', () => {
  const prisma = new PrismaClient();
  const adminId = randomUUID();

  beforeAll(async () => {
    await prisma.admin.create({
      data: {
        id: adminId,
        shopName: 'Refresh test',
        ownerName: 'Test',
        email: `refresh-${randomUUID()}@example.com`,
        phone: `+9197${String(Date.now()).slice(-8)}`,
        passwordHash: 'x',
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany({ where: { adminId } });
    await prisma.admin.delete({ where: { id: adminId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('consumeRefreshAndRotate succeeds once then returns REPLAY', async () => {
    const raw = newRefreshRaw();
    await persistRefreshToken(prisma, {
      adminId,
      raw,
      userAgent: 'vitest',
      ip: '127.0.0.1',
    });

    const first = await consumeRefreshAndRotate(prisma, raw, {});
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.kind).toBe('admin');
      expect(first.accessToken.length).toBeGreaterThan(20);
      expect(first.newRefreshRaw).not.toBe(raw);
    }

    const second = await consumeRefreshAndRotate(prisma, raw, {});
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.code).toBe('REPLAY');
    }
  });
});
