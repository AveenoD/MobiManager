/**
 * Dev helper: seed an admin account with an Elite subscription + all ADDON modules.
 *
 * Usage:
 *   npx tsx scripts/seed-elite.ts --email aneesshaikh329@gmail.com
 */

import { PrismaClient } from '@prisma/client';
import { MODULE_CATALOG, MODULE_KEYS } from '@/lib/modules';

const prisma = new PrismaClient();

function parseEmail(argv: string[]): string {
  const idx = argv.findIndex((x) => x === '--email');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].trim();
  return 'aneesshaikh329@gmail.com';
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function ensureModuleCatalog() {
  const entries = Object.values(MODULE_CATALOG).map((m, i) => ({
    key: m.key,
    name: m.name,
    description: m.description,
    category: m.category,
    billingType: m.category === 'core' ? ('FREE' as const) : ('ADDON' as const),
    priceMonthly: m.priceMonthly ?? null,
    priceYearly: m.priceYearly ?? null,
    sortOrder: i + 1,
    isActive: true,
  }));

  await prisma.$transaction(
    entries.map((m) =>
      prisma.module.upsert({
        where: { key: m.key },
        update: {
          name: m.name,
          description: m.description,
          category: m.category,
          billingType: m.billingType,
          priceMonthly: m.priceMonthly,
          priceYearly: m.priceYearly,
          sortOrder: m.sortOrder,
          isActive: true,
        },
        create: m,
      })
    )
  );
}

async function main() {
  const email = parseEmail(process.argv.slice(2));

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!admin) {
    throw new Error(`Admin not found for email=${email}`);
  }

  const plan = await prisma.plan.findUnique({
    where: { name: 'Elite' },
    select: { id: true, name: true, priceMonthly: true, maxSubAdmins: true, maxShops: true },
  });
  if (!plan) {
    throw new Error(`Plan "Elite" not found. Run: npm run db:seed`);
  }

  await ensureModuleCatalog();

  const now = new Date();
  const startDate = daysFromNow(-1);
  const endDate = daysFromNow(3650); // ~10 years for testing

  await prisma.$transaction(async (tx) => {
    // Close previous "current" subscriptions (if any)
    await tx.subscription.updateMany({
      where: { adminId: admin.id, isCurrent: true },
      data: { isCurrent: false },
    });

    // Create a paid current subscription for Elite.
    await tx.subscription.create({
      data: {
        adminId: admin.id,
        planId: plan.id,
        billingType: 'MONTHLY',
        amountPaid: plan.priceMonthly,
        startDate,
        endDate,
        paymentStatus: 'PAID',
        paymentReference: `DEV-SEED-${now.toISOString()}`,
        isCurrent: true,
      },
    });

    // Enable all add-on modules as PAID purchases (very long expiry).
    const addonKeys = Object.values(MODULE_CATALOG)
      .filter((m) => m.category === 'add-on')
      .map((m) => m.key);

    const modules = await tx.module.findMany({
      where: { key: { in: addonKeys } },
      select: { id: true, key: true },
    });

    await tx.adminModule.deleteMany({
      where: { adminId: admin.id, module: { key: { in: addonKeys } } },
    });

    await tx.adminModule.createMany({
      data: modules.map((m) => ({
        adminId: admin.id,
        moduleId: m.id,
        status: 'PAID',
        startDate,
        endDate,
        autoRenew: true,
      })),
      skipDuplicates: true,
    });

    // Seed entitlements for modules that use caps (shops / sub-admins).
    await tx.entitlement.upsert({
      where: { adminId_moduleKey: { adminId: admin.id, moduleKey: MODULE_KEYS.MULTI_SHOP } },
      update: { limitType: 'shop_count', maxValue: plan.maxShops ?? 9999, usedValue: 0, updatedAt: now },
      create: {
        adminId: admin.id,
        moduleKey: MODULE_KEYS.MULTI_SHOP,
        limitType: 'shop_count',
        maxValue: plan.maxShops ?? 9999,
        usedValue: 0,
        resetAt: null,
      },
    });

    await tx.entitlement.upsert({
      where: { adminId_moduleKey: { adminId: admin.id, moduleKey: MODULE_KEYS.EXTRA_SEATS } },
      update: { limitType: 'sub_admin_count', maxValue: plan.maxSubAdmins ?? 0, usedValue: 0, updatedAt: now },
      create: {
        adminId: admin.id,
        moduleKey: MODULE_KEYS.EXTRA_SEATS,
        limitType: 'sub_admin_count',
        maxValue: plan.maxSubAdmins ?? 0,
        usedValue: 0,
        resetAt: null,
      },
    });
  });

  console.log(`✅ Seeded Elite + all add-ons for ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ seed-elite failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

