const fs = require("fs");
const path = require("path");

function loadDatabaseUrlFromDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;

  const txt = fs.readFileSync(envPath, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
    if (!m) continue;

    let v = m[1] ?? "";
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return v.trim();
  }
  return null;
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/check-user.js <email>");
    process.exit(2);
  }

  if (!process.env.DATABASE_URL) {
    const fromEnv = loadDatabaseUrlFromDotEnv();
    if (fromEnv) process.env.DATABASE_URL = fromEnv;
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in environment or .env");
    process.exit(2);
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const now = new Date();

    const [admin, superAdmin] = await Promise.all([
      prisma.admin.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          shopName: true,
          ownerName: true,
          isActive: true,
          createdAt: true,
          subscriptions: {
            where: { isCurrent: true },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              planId: true,
              billingType: true,
              paymentStatus: true,
              startDate: true,
              endDate: true,
              isCurrent: true,
              amountPaid: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.superAdmin.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
    ]);

    const currentSub = admin?.subscriptions?.[0] ?? null;
    const trialStatus = currentSub?.endDate
      ? new Date(currentSub.endDate) > now
        ? "ACTIVE"
        : "EXPIRED"
      : null;

    const out = {
      email,
      now: now.toISOString(),
      adminExists: Boolean(admin),
      superAdminExists: Boolean(superAdmin),
      admin: admin
        ? {
            id: admin.id,
            email: admin.email,
            shopName: admin.shopName,
            ownerName: admin.ownerName,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
          }
        : null,
      currentSubscription: currentSub
        ? {
            id: currentSub.id,
            planId: currentSub.planId,
            billingType: currentSub.billingType,
            paymentStatus: currentSub.paymentStatus,
            startDate: currentSub.startDate,
            endDate: currentSub.endDate,
            isCurrent: currentSub.isCurrent,
            amountPaid: currentSub.amountPaid,
            createdAt: currentSub.createdAt,
            trialStatus,
          }
        : null,
      superAdmin: superAdmin ?? null,
    };

    console.log(JSON.stringify(out, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

