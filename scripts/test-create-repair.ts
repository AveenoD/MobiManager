import { PrismaClient } from '@prisma/client';
import { jwtSign } from '../lib/jwt';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');
const ADMIN_EMAIL = (process.env.SMOKE_ADMIN_EMAIL?.trim() || 'aneesshaikh329@gmail.com').trim();
const BYPASS_LOGIN_JWT = process.env.SMOKE_BYPASS_LOGIN_JWT === '1';

async function adminCookie(email: string): Promise<string> {
  if (!BYPASS_LOGIN_JWT) {
    throw new Error('Set SMOKE_BYPASS_LOGIN_JWT=1 for this test script.');
  }
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, verificationStatus: true, isActive: true },
    });
    if (!admin) throw new Error(`Admin not found for email=${email}`);

    const shop = await prisma.shop.findFirst({
      where: { adminId: admin.id, isMain: true },
      select: { id: true },
    });
    if (!shop) throw new Error(`Main shop not found for adminId=${admin.id}`);

    const sub = await prisma.subscription.findFirst({
      where: { adminId: admin.id, isCurrent: true },
      select: { planId: true },
    });

    const token = await jwtSign(
      {
        adminId: admin.id,
        role: 'admin',
        shopId: shop.id,
        verificationStatus: admin.verificationStatus,
        isActive: admin.isActive,
        planId: sub?.planId ?? null,
      } as any,
      { expiresIn: '24h' }
    );

    return `admin_token=${token}`;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const cookie = await adminCookie(ADMIN_EMAIL);

  const prisma = new PrismaClient();
  try {
    const admin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
    if (!admin) throw new Error(`Admin not found for email=${ADMIN_EMAIL}`);

    const shop = await prisma.shop.findFirst({
      where: { adminId: admin.id, isMain: true },
      select: { id: true },
    });
    if (!shop) throw new Error(`Main shop not found for adminId=${admin.id}`);

    const payload = {
      shopId: shop.id,
      customerName: 'Test Customer',
      customerPhone: '9874563210',
      deviceBrand: 'Samsung',
      deviceModel: 'Galaxy 12',
      issueDescription: 'Charging point issue',
      repairCost: 50,
      customerCharge: 150,
      advancePaid: 0,
      // Date-only string (HTML date input style)
      estimatedDelivery: '2026-05-07',
      notes: 'test repair',
    };

    const res = await fetch(`${BASE_URL}/api/admin/repairs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    // eslint-disable-next-line no-console
    console.log(`status=${res.status}`);
    // eslint-disable-next-line no-console
    console.log(text);
    process.exit(res.ok ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

