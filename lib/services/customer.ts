/**
 * Customer service — findOrCreate, search, and summary helpers.
 * All functions require the caller to wrap queries in withAdminContext(adminId, ...).
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { normalizePhone, NormalizeResult } from '../phone';

export interface FindOrCreateResult {
  customer: {
    id: string;
    phoneE164: string;
    name: string | null;
    notes: string | null;
    createdAt: Date;
  };
  created: boolean;
}

/**
 * Normalize a phone string and find or create a Customer record.
 * If `name` is provided and the customer already exists with a different name,
 * the name is NOT updated (avoiding accidental overwrites).
 *
 * @returns The customer record and whether it was newly created.
 */
export async function findOrCreateCustomer(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  phoneInput: string,
  name?: string
): Promise<FindOrCreateResult> {
  const normalized = normalizePhone(phoneInput);
  if (!normalized) {
    throw new CustomerValidationError('Invalid phone number format');
  }

  const { e164 } = normalized;

  const existing = await db.customer.findUnique({
    where: { adminId_phoneE164: { adminId, phoneE164: e164 } },
  });

  if (existing) {
    return { customer: existing, created: false };
  }

  const customer = await db.customer.create({
    data: {
      adminId,
      phoneE164: e164,
      name: name ?? null,
    },
  });

  return { customer, created: true };
}

/**
 * Search customers by phone (exact or partial) or name.
 *
 * Partial phone search uses the last 6 digits for fast index usage.
 * Results are ordered by most recent first.
 *
 * @param partialMatch - When true, matches last 6 digits of phone.
 *                       When false (default), requires exact E.164 match.
 */
export async function searchCustomers(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  opts: {
    phone?: string;
    name?: string;
    partialMatch?: boolean;
    limit?: number;
  }
): Promise<Array<{
  id: string;
  phoneE164: string;
  name: string | null;
  notes: string | null;
  createdAt: Date;
}>> {
  const { phone, name, partialMatch = false, limit = 20 } = opts;

  if (!phone && !name) return [];

  const where: Prisma.CustomerWhereInput = { adminId };

  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) return []; // invalid input = no results

    if (partialMatch) {
      // Use the last 6 local digits for partial search
      const digits6 = phone.replace(/\D/g, '').slice(-6);
      where.phoneE164 = { contains: digits6 };
    } else {
      where.phoneE164 = normalized.e164;
    }
  }

  if (name) {
    where.name = { contains: name, mode: 'insensitive' };
  }

  return db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      phoneE164: true,
      name: true,
      notes: true,
      createdAt: true,
    },
  });
}

export interface CustomerSummary {
  customer: {
    id: string;
    phoneE164: string;
    name: string | null;
    createdAt: Date;
  };
  sales: {
    totalCount: number;
    totalAmount: number;
    lastSaleDate: Date | null;
  };
  repairs: {
    totalCount: number;
    pendingCount: number;
    lastRepairDate: Date | null;
  };
  recharges: {
    totalCount: number;
    totalCommission: number;
    lastRechargeDate: Date | null;
  };
}

/**
 * Returns aggregated summary of a customer's activity.
 */
export async function getCustomerSummary(
  db: PrismaClient | Prisma.TransactionClient,
  adminId: string,
  customerId: string
): Promise<CustomerSummary | null> {
  // Verify customer belongs to this admin
  const customer = await db.customer.findFirst({
    where: { id: customerId, adminId },
    select: { id: true, phoneE164: true, name: true, createdAt: true },
  });

  if (!customer) return null;

  const [salesAgg, repairsAgg, rechargesAgg] = await Promise.all([
    db.sale.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _sum: { totalAmount: true },
      _max: { saleDate: true },
    }),
    db.repair.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _max: { receivedDate: true },
    }),
    db.rechargeTransfer.aggregate({
      where: { customerId, adminId },
      _count: { id: true },
      _sum: { commissionEarned: true },
      _max: { transactionDate: true },
    }),
  ]);

  // Pending repairs = not DELIVERED or CANCELLED
  const pendingRepairs = await db.repair.count({
    where: {
      customerId,
      adminId,
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
  });

  return {
    customer,
    sales: {
      totalCount: salesAgg._count.id,
      totalAmount: Number(salesAgg._sum.totalAmount ?? 0),
      lastSaleDate: salesAgg._max.saleDate ?? null,
    },
    repairs: {
      totalCount: repairsAgg._count.id,
      pendingCount: pendingRepairs,
      lastRepairDate: repairsAgg._max.receivedDate ?? null,
    },
    recharges: {
      totalCount: rechargesAgg._count.id,
      totalCommission: Number(rechargesAgg._sum.commissionEarned ?? 0),
      lastRechargeDate: rechargesAgg._max.transactionDate ?? null,
    },
  };
}

export class CustomerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerValidationError';
  }
}
