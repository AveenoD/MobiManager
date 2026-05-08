import { PrismaClient } from '@prisma/client';
import { jwtSign } from '../lib/jwt';

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3009').replace(/\/$/, '');
const ADMIN_EMAIL = (process.env.SMOKE_ADMIN_EMAIL?.trim() || 'aneesshaikh329@gmail.com').trim();

async function adminCookie(email: string): Promise<string> {
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

async function postRecharge(cookie: string, payload: any) {
  const res = await fetch(`${BASE_URL}/api/admin/recharge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(`POST /api/admin/recharge failed (status=${res.status}) body=${JSON.stringify(data)}`);
  }
  return data.record;
}

async function getRechargeList(cookie: string, qs: string) {
  const res = await fetch(`${BASE_URL}/api/admin/recharge${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json', Cookie: cookie },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(`GET /api/admin/recharge failed (status=${res.status}) body=${JSON.stringify(data)}`);
  }
  return data;
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

    // 1) Create one mobile recharge
    const mobilePhone = '9874578957';
    const mobile = await postRecharge(cookie, {
      shopId: shop.id,
      serviceType: 'MOBILE_RECHARGE',
      customerName: 'Sam joe',
      customerPhone: mobilePhone,
      beneficiaryNumber: mobilePhone,
      operator: 'Jio',
      amount: 199,
      commissionEarned: 0,
      transactionRef: 'UTR-MOB-199',
      status: 'SUCCESS',
    });

    // 2) Create one money transfer
    const transfer = await postRecharge(cookie, {
      shopId: shop.id,
      serviceType: 'MONEY_TRANSFER',
      customerName: 'Sam joe',
      customerPhone: mobilePhone,
      beneficiaryNumber: '9874500000',
      operator: 'UPI',
      amount: 500,
      commissionEarned: 0,
      transactionRef: 'UTR-XFER-500',
      status: 'SUCCESS',
    });

    // 3) Verify DB has them
    const ids = [mobile.id, transfer.id];
    const rows = await prisma.rechargeTransfer.findMany({
      where: { adminId: admin.id, id: { in: ids } },
      select: { id: true, serviceType: true, amount: true, status: true, beneficiaryNumber: true, transactionRef: true },
    });

    // 4) Verify list endpoint returns them (what UI uses)
    const listAll = await getRechargeList(cookie, `?period=TODAY&limit=50`);
    const listSearchMob = await getRechargeList(cookie, `?period=TODAY&search=${encodeURIComponent(mobilePhone)}&limit=50`);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      created: { mobile, transfer },
      dbFoundCount: rows.length,
      dbFound: rows,
      listAllCount: Array.isArray(listAll.records) ? listAll.records.length : null,
      listAllHasCreated: ids.every((id: string) => (listAll.records || []).some((r: any) => r.id === id)),
      listSearchCount: Array.isArray(listSearchMob.records) ? listSearchMob.records.length : null,
      listSearchHasMobile: (listSearchMob.records || []).some((r: any) => r.id === mobile.id),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

