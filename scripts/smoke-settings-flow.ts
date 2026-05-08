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

    const shop = await prisma.shop.findFirst({ where: { adminId: admin.id, isMain: true }, select: { id: true } });
    if (!shop) throw new Error(`Main shop not found for adminId=${admin.id}`);

    const sub = await prisma.subscription.findFirst({ where: { adminId: admin.id, isCurrent: true }, select: { planId: true } });

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

async function http(cookie: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...(init || {}),
    headers: { Accept: 'application/json', ...(init?.headers || {}), Cookie: cookie } as any,
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

async function main() {
  const cookie = await adminCookie(ADMIN_EMAIL);

  const shopName = `Branch ${new Date().toISOString().slice(11, 19)}`;
  const { res: shopRes, data: shopData } = await http(cookie, '/api/admin/shops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: shopName, city: 'Mumbai', address: 'Test Address' }),
  });

  // If plan blocks multi-shop, still treat as success for gating verification.
  const shopCreated = shopRes.ok && shopData?.success;
  const shopId = shopCreated ? shopData.shop?.id : null;

  let subAdminCreated = false;
  let subAdminId: string | null = null;
  let subAdminCreateDebug: any = null;
  if (shopId) {
    const { res: saRes, data: saData } = await http(cookie, '/api/admin/sub-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId,
        name: 'Manager One',
        email: `manager.${Date.now()}@example.com`,
        phone: '9876501234',
        password: 'Manager@123',
        permissions: { canCreate: true, canEdit: true, canDelete: false, canViewReports: true },
      }),
    });
    subAdminCreated = saRes.ok && saData?.success;
    subAdminId = subAdminCreated ? saData.subAdmin?.id : null;
    subAdminCreateDebug = { status: saRes.status, body: saData };
  }

  // Verify reads
  const { data: shopsList } = await http(cookie, '/api/admin/shops', { method: 'GET' });
  const { data: subAdminsList } = await http(cookie, '/api/admin/sub-admins', { method: 'GET' });
  const { data: integ } = await http(cookie, '/api/admin/settings/integrations', { method: 'GET' });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        baseUrl: BASE_URL,
        shopCreate: { ok: shopRes.ok, body: shopData },
        subAdminCreate: { ok: subAdminCreated, id: subAdminId, debug: subAdminCreateDebug },
        shopsCount: Array.isArray(shopsList?.shops) ? shopsList.shops.length : null,
        subAdminsCount: Array.isArray(subAdminsList?.subAdmins) ? subAdminsList.subAdmins.length : null,
        integrations: integ,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

