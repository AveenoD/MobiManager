/**
 * Module catalog — keys, metadata, and runtime enforcement helpers.
 * All module keys are canonical identifiers used across Prisma, API routes, and UI.
 */

import { NextResponse } from 'next/server';
import { prisma } from './db';
import { flags } from './featureFlags';

// ─── Catalog keys ──────────────────────────────────────────────────────────────

export const MODULE_KEYS = {
  INVENTORY: 'INVENTORY',
  SALES: 'SALES',
  REPAIR: 'REPAIR',
  RECHARGE: 'RECHARGE',
  MONEY_TRANSFER: 'MONEY_TRANSFER',
  REPORTS_ADVANCED: 'REPORTS_ADVANCED',
  AUDIT_ADVANCED: 'AUDIT_ADVANCED',
  MULTI_SHOP: 'MULTI_SHOP',
  EXTRA_SEATS: 'EXTRA_SEATS',
  AI_OCR_EXTRACT: 'AI_OCR_EXTRACT',
  AI_PACK_BASIC: 'AI_PACK_BASIC',
  AI_PACK_STANDARD: 'AI_PACK_STANDARD',
  AI_PACK_PRO: 'AI_PACK_PRO',
} as const;

export type ModuleKey = typeof MODULE_KEYS[keyof typeof MODULE_KEYS];

// ─── Catalog metadata ─────────────────────────────────────────────────────────

export interface ModuleMeta {
  key: ModuleKey;
  name: string;
  description: string;
  category: 'core' | 'add-on';
  priceMonthly?: number;
  priceYearly?: number;
}

export const MODULE_CATALOG: Record<ModuleKey, ModuleMeta> = {
  [MODULE_KEYS.INVENTORY]: {
    key: MODULE_KEYS.INVENTORY,
    name: 'Inventory Management',
    description: 'Track products, stock movements, and low-stock alerts across shops.',
    category: 'core',
  },
  [MODULE_KEYS.SALES]: {
    key: MODULE_KEYS.SALES,
    name: 'Sales & Billing',
    description: 'Record sales, manage payments, and track pending amounts.',
    category: 'core',
  },
  [MODULE_KEYS.REPAIR]: {
    key: MODULE_KEYS.REPAIR,
    name: 'Repair Tracking',
    description: 'Track repair jobs from receipt to delivery with parts usage.',
    category: 'core',
  },
  [MODULE_KEYS.RECHARGE]: {
    key: MODULE_KEYS.RECHARGE,
    name: 'Mobile & DTH Recharge',
    description: 'Process mobile, DTH, and electricity bill recharges.',
    category: 'add-on',
    priceMonthly: 29,
    priceYearly: 290,
  },
  [MODULE_KEYS.MONEY_TRANSFER]: {
    key: MODULE_KEYS.MONEY_TRANSFER,
    name: 'Money Transfer',
    description: 'Enable domestic money transfers with commission tracking.',
    category: 'add-on',
    priceMonthly: 49,
    priceYearly: 490,
  },
  [MODULE_KEYS.REPORTS_ADVANCED]: {
    key: MODULE_KEYS.REPORTS_ADVANCED,
    name: 'Advanced Reports',
    description: 'Profit/loss statements, sales analytics, and custom reports.',
    category: 'add-on',
    priceMonthly: 49,
    priceYearly: 490,
  },
  [MODULE_KEYS.AUDIT_ADVANCED]: {
    key: MODULE_KEYS.AUDIT_ADVANCED,
    name: 'Audit Trail',
    description: 'Track every change to inventory, sales, and repairs with full history.',
    category: 'add-on',
    priceMonthly: 29,
    priceYearly: 290,
  },
  [MODULE_KEYS.MULTI_SHOP]: {
    key: MODULE_KEYS.MULTI_SHOP,
    name: 'Multi-Shop Management',
    description: 'Manage multiple shops, each with its own inventory and staff.',
    category: 'add-on',
    // Locked pricing: ₹39/mo (per extra shop can be implemented later via entitlements).
    priceMonthly: 39,
    priceYearly: 390,
  },
  [MODULE_KEYS.EXTRA_SEATS]: {
    key: MODULE_KEYS.EXTRA_SEATS,
    name: 'Extra Sub-Admin Seats',
    description: "Add more sub-admin accounts beyond your plan's default limit.",
    category: 'add-on',
    // Locked pricing (tier-2/3 friendly): ₹19/mo per seat.
    // Yearly = ~10x monthly (2 months free).
    priceMonthly: 19,
    priceYearly: 190,
  },
  [MODULE_KEYS.AI_OCR_EXTRACT]: {
    key: MODULE_KEYS.AI_OCR_EXTRACT,
    name: 'AI OCR Receipt Scan',
    description: 'Use AI to scan and auto-extract product details from receipt images.',
    category: 'add-on',
    // Locked pricing: AI add-on packs are handled separately.
    // Keep this as a low entry enablement fee.
    priceMonthly: 99,
    priceYearly: 990,
  },
  [MODULE_KEYS.AI_PACK_BASIC]: {
    key: MODULE_KEYS.AI_PACK_BASIC,
    name: 'AI Pack Basic',
    description: '50 OCR extractions + 5 festival offers per day.',
    category: 'add-on',
    priceMonthly: 99,
    priceYearly: 990,
  },
  [MODULE_KEYS.AI_PACK_STANDARD]: {
    key: MODULE_KEYS.AI_PACK_STANDARD,
    name: 'AI Pack Standard',
    description: '150 OCR extractions + 15 festival offers + 10 slow stock + unlimited language assist per day.',
    category: 'add-on',
    priceMonthly: 199,
    priceYearly: 1990,
  },
  [MODULE_KEYS.AI_PACK_PRO]: {
    key: MODULE_KEYS.AI_PACK_PRO,
    name: 'AI Pack Pro',
    description: '500 OCR extractions + 30 festival offers + 25 slow stock + 5 monthly strategy + unlimited language assist per day.',
    category: 'add-on',
    priceMonthly: 299,
    priceYearly: 2990,
  },
};

// Modules always available in every plan (no purchase required)
export const FREE_MODULES: ModuleKey[] = [
  MODULE_KEYS.INVENTORY,
  MODULE_KEYS.SALES,
  MODULE_KEYS.REPAIR,
];

// ─── Stable error shape — frontend renders as "Upgrade to unlock" ─────────────

export interface ModuleAccessError {
  success: false;
  error: 'MODULE_REQUIRED';
  code: ModuleKey;
  moduleName: string;
  upgradeUrl: string;
}

export function moduleAccessError(key: ModuleKey): ModuleAccessError {
  const meta = MODULE_CATALOG[key];
  return {
    success: false,
    error: 'MODULE_REQUIRED',
    code: key,
    moduleName: meta?.name ?? key,
    upgradeUrl: '/settings/billing',
  };
}

export function moduleAccessResponse(key: ModuleKey): NextResponse {
  return new NextResponse(JSON.stringify(moduleAccessError(key)), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Runtime enforcement helpers ───────────────────────────────────────────────

/**
 * Returns true if the admin has an active (PAID, not expired) purchase for the module.
 * Free modules are always enabled.
 */
export async function isModuleEnabled(adminId: string, key: ModuleKey): Promise<boolean> {
  if (FREE_MODULES.includes(key)) return true;

  const purchase = await prisma.adminModule.findFirst({
    where: {
      adminId,
      module: { key },
    },
    select: { status: true, endDate: true },
  });

  if (!purchase) return false;
  if (purchase.status !== 'PAID') return false;
  if (purchase.endDate && new Date(purchase.endDate) < new Date()) return false;

  return true;
}

/**
 * Gate a route handler on module access.
 * Returns a 403 NextResponse when the module is not enabled, otherwise null.
 *
 * Usage:
 *   const blocked = await assertModuleEnabled(adminId, MODULE_KEYS.REPAIR);
 *   if (blocked) return blocked;
 */
export async function assertModuleEnabled(
  adminId: string,
  key: ModuleKey
): Promise<NextResponse | null> {
  const enabled = await isModuleEnabled(adminId, key);
  if (!enabled) return moduleAccessResponse(key);
  return null;
}

/**
 * Returns whether the admin is within their entitlement limit.
 */
export async function checkEntitlement(
  adminId: string,
  moduleKey: ModuleKey,
  limitType: string
): Promise<{ allowed: boolean; used: number; max: number }> {
  const entitlement = await prisma.entitlement.findUnique({
    where: { adminId_moduleKey: { adminId, moduleKey } },
    select: { maxValue: true, usedValue: true },
  });

  if (!entitlement) return { allowed: true, used: 0, max: -1 };

  return {
    allowed: entitlement.usedValue < entitlement.maxValue,
    used: entitlement.usedValue,
    max: entitlement.maxValue,
  };
}

/**
 * Increment usage counter for an entitlement. Safe to call on every write.
 * When `flags.atomicEntitlement` is on, uses capped UPDATE…RETURNING via `consumeEntitlement`.
 */
export async function incrementEntitlement(
  adminId: string,
  moduleKey: ModuleKey,
  limitType: string,
  amount = 1
): Promise<void> {
  if (flags.atomicEntitlement) {
    const { consumeEntitlement } = await import('./services/entitlement');
    const r = await consumeEntitlement(prisma, { adminId, moduleKey, limitType, amount });
    if (!r.ok) {
      throw new Error('LIMIT_REACHED');
    }
    if (r.mode === 'consumed') {
      return;
    }
  }

  await prisma.entitlement.upsert({
    where: { adminId_moduleKey: { adminId, moduleKey } },
    update: { usedValue: { increment: amount } },
    create: { adminId, moduleKey, limitType, maxValue: 0, usedValue: amount },
  });
}

/**
 * Decrement usage counter when a resource is deleted.
 */
export async function decrementEntitlement(
  adminId: string,
  moduleKey: ModuleKey,
  limitType: string,
  amount = 1
): Promise<void> {
  await prisma.entitlement.upsert({
    where: { adminId_moduleKey: { adminId, moduleKey } },
    update: { usedValue: { decrement: amount } },
    create: { adminId, moduleKey, limitType, maxValue: 0, usedValue: 0 },
  });
}

/**
 * Sync entitlement max values from current plan + add-on purchases.
 * Call on login and whenever plan/add-on status changes.
 */
export async function syncEntitlements(
  adminId: string,
  plan: { maxSubAdmins: number; maxShops: number | null }
): Promise<void> {
  const upserts = [
    { moduleKey: MODULE_KEYS.MULTI_SHOP, limitType: 'shop_count', maxValue: plan.maxShops ?? 9999 },
    { moduleKey: MODULE_KEYS.EXTRA_SEATS, limitType: 'sub_admin_count', maxValue: plan.maxSubAdmins },
  ];

  await prisma.$transaction(
    upserts.map(({ moduleKey, limitType, maxValue }) =>
      prisma.entitlement.upsert({
        where: { adminId_moduleKey: { adminId, moduleKey } },
        update: { maxValue },
        create: { adminId, moduleKey, limitType, maxValue, usedValue: 0 },
      })
    )
  );
}

/**
 * Seed the Module table. Idempotent — safe to call on every startup.
 */
export async function seedModuleCatalog(): Promise<void> {
  const modules = [
    { key: MODULE_KEYS.INVENTORY, name: MODULE_CATALOG[MODULE_KEYS.INVENTORY].name, description: MODULE_CATALOG[MODULE_KEYS.INVENTORY].description, category: 'core', billingType: 'FREE' as const, sortOrder: 1 },
    { key: MODULE_KEYS.SALES, name: MODULE_CATALOG[MODULE_KEYS.SALES].name, description: MODULE_CATALOG[MODULE_KEYS.SALES].description, category: 'core', billingType: 'FREE' as const, sortOrder: 2 },
    { key: MODULE_KEYS.REPAIR, name: MODULE_CATALOG[MODULE_KEYS.REPAIR].name, description: MODULE_CATALOG[MODULE_KEYS.REPAIR].description, category: 'core', billingType: 'FREE' as const, sortOrder: 3 },
    { key: MODULE_KEYS.RECHARGE, name: MODULE_CATALOG[MODULE_KEYS.RECHARGE].name, description: MODULE_CATALOG[MODULE_KEYS.RECHARGE].description, category: 'add-on', billingType: 'ADDON' as const, priceMonthly: MODULE_CATALOG[MODULE_KEYS.RECHARGE].priceMonthly!, priceYearly: MODULE_CATALOG[MODULE_KEYS.RECHARGE].priceYearly!, sortOrder: 4 },
    { key: MODULE_KEYS.MONEY_TRANSFER, name: MODULE_CATALOG[MODULE_KEYS.MONEY_TRANSFER].name, description: MODULE_CATALOG[MODULE_KEYS.MONEY_TRANSFER].description, category: 'add-on', billingType: 'ADDON' as const, priceMonthly: MODULE_CATALOG[MODULE_KEYS.MONEY_TRANSFER].priceMonthly!, priceYearly: MODULE_CATALOG[MODULE_KEYS.MONEY_TRANSFER].priceYearly!, sortOrder: 5 },
    { key: MODULE_KEYS.REPORTS_ADVANCED, name: MODULE_CATALOG[MODULE_KEYS.REPORTS_ADVANCED].name, description: MODULE_CATALOG[MODULE_KEYS.REPORTS_ADVANCED].description, category: 'add-on', billingType: 'ADDON' as const, priceMonthly: MODULE_CATALOG[MODULE_KEYS.REPORTS_ADVANCED].priceMonthly!, priceYearly: MODULE_CATALOG[MODULE_KEYS.REPORTS_ADVANCED].priceYearly!, sortOrder: 6 },
    { key: MODULE_KEYS.AUDIT_ADVANCED, name: MODULE_CATALOG[MODULE_KEYS.AUDIT_ADVANCED].name, description: MODULE_CATALOG[MODULE_KEYS.AUDIT_ADVANCED].description, category: 'add-on', billingType: 'ADDON' as const, priceMonthly: MODULE_CATALOG[MODULE_KEYS.AUDIT_ADVANCED].priceMonthly!, priceYearly: MODULE_CATALOG[MODULE_KEYS.AUDIT_ADVANCED].priceYearly!, sortOrder: 7 },
    { key: MODULE_KEYS.MULTI_SHOP, name: MODULE_CATALOG[MODULE_KEYS.MULTI_SHOP].name, description: MODULE_CATALOG[MODULE_KEYS.MULTI_SHOP].description, category: 'add-on', billingType: 'ADDON' as const, priceMonthly: MODULE_CATALOG[MODULE_KEYS.MULTI_SHOP].priceMonthly!, priceYearly: MODULE_CATALOG[MODULE_KEYS.MULTI_SHOP].priceYearly!, sortOrder: 8 },
    {
      key: MODULE_KEYS.EXTRA_SEATS,
      name: MODULE_CATALOG[MODULE_KEYS.EXTRA_SEATS].name,
      description: MODULE_CATALOG[MODULE_KEYS.EXTRA_SEATS].description,
      category: 'add-on',
      billingType: 'ADDON' as const,
      priceMonthly: MODULE_CATALOG[MODULE_KEYS.EXTRA_SEATS].priceMonthly!,
      priceYearly: MODULE_CATALOG[MODULE_KEYS.EXTRA_SEATS].priceYearly!,
      sortOrder: 9,
    },
    {
      key: MODULE_KEYS.AI_OCR_EXTRACT,
      name: MODULE_CATALOG[MODULE_KEYS.AI_OCR_EXTRACT].name,
      description: MODULE_CATALOG[MODULE_KEYS.AI_OCR_EXTRACT].description,
      category: 'add-on',
      billingType: 'ADDON' as const,
      priceMonthly: MODULE_CATALOG[MODULE_KEYS.AI_OCR_EXTRACT].priceMonthly!,
      priceYearly: MODULE_CATALOG[MODULE_KEYS.AI_OCR_EXTRACT].priceYearly!,
      sortOrder: 10,
    },
    {
      key: MODULE_KEYS.AI_PACK_BASIC,
      name: MODULE_CATALOG[MODULE_KEYS.AI_PACK_BASIC].name,
      description: MODULE_CATALOG[MODULE_KEYS.AI_PACK_BASIC].description,
      category: 'add-on',
      billingType: 'ADDON' as const,
      priceMonthly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_BASIC].priceMonthly!,
      priceYearly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_BASIC].priceYearly!,
      sortOrder: 11,
    },
    {
      key: MODULE_KEYS.AI_PACK_STANDARD,
      name: MODULE_CATALOG[MODULE_KEYS.AI_PACK_STANDARD].name,
      description: MODULE_CATALOG[MODULE_KEYS.AI_PACK_STANDARD].description,
      category: 'add-on',
      billingType: 'ADDON' as const,
      priceMonthly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_STANDARD].priceMonthly!,
      priceYearly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_STANDARD].priceYearly!,
      sortOrder: 12,
    },
    {
      key: MODULE_KEYS.AI_PACK_PRO,
      name: MODULE_CATALOG[MODULE_KEYS.AI_PACK_PRO].name,
      description: MODULE_CATALOG[MODULE_KEYS.AI_PACK_PRO].description,
      category: 'add-on',
      billingType: 'ADDON' as const,
      priceMonthly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_PRO].priceMonthly!,
      priceYearly: MODULE_CATALOG[MODULE_KEYS.AI_PACK_PRO].priceYearly!,
      sortOrder: 13,
    },
  ];

  await prisma.$transaction(
    modules.map(m =>
      prisma.module.upsert({
        where: { key: m.key },
        update: { name: m.name, description: m.description, category: m.category, billingType: m.billingType, priceMonthly: m.priceMonthly, priceYearly: m.priceYearly, sortOrder: m.sortOrder, isActive: true },
        create: m,
      })
    )
  );
}