/**
 * S8 — opaque refresh tokens (hashed at rest) with rotation on use.
 */

import { createHash, randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import { jwtSign } from '../jwt';

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function newRefreshRaw(): string {
  return randomBytes(48).toString('base64url');
}

export async function persistRefreshToken(
  db: PrismaClient,
  input: {
    adminId?: string | null;
    subAdminId?: string | null;
    superAdminId?: string | null;
    raw: string;
    userAgent?: string | null;
    ip?: string | null;
  }
): Promise<void> {
  const tokenHash = hashRefreshToken(input.raw);
  const expiresAt = new Date(Date.now() + REFRESH_MS);
  await db.refreshToken.create({
    data: {
      adminId: input.adminId ?? undefined,
      subAdminId: input.subAdminId ?? undefined,
      superAdminId: input.superAdminId ?? undefined,
      tokenHash,
      expiresAt,
      userAgent: input.userAgent ?? undefined,
      ip: input.ip ?? undefined,
    },
  });
}

export type RefreshConsumeResult =
  | {
      ok: true;
      accessToken: string;
      newRefreshRaw: string;
      kind: 'admin' | 'subadmin' | 'superadmin';
    }
  | { ok: false; code: 'INVALID' | 'REPLAY' | 'EXPIRED' };

/**
 * Validates refresh `raw`, revokes the row (rotation), mints new access + refresh material.
 * Caller must set cookies from `accessToken` / `newRefreshRaw`.
 */
export async function consumeRefreshAndRotate(
  db: PrismaClient,
  raw: string,
  opts: { userAgent?: string | null; ip?: string | null }
): Promise<RefreshConsumeResult> {
  const tokenHash = hashRefreshToken(raw);

  return db.$transaction(async (tx) => {
    const row = await tx.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!row) {
      return { ok: false, code: 'INVALID' };
    }

    if (row.revokedAt) {
      return { ok: false, code: 'REPLAY' };
    }

    if (row.expiresAt < new Date()) {
      await tx.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: new Date() },
      });
      return { ok: false, code: 'EXPIRED' };
    }

    await tx.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });

    const newRaw = newRefreshRaw();
    const newHash = hashRefreshToken(newRaw);
    const expiresAt = new Date(Date.now() + REFRESH_MS);

    if (row.subAdminId) {
      const sub = await tx.subAdmin.findUnique({
        where: { id: row.subAdminId },
        include: { admin: true },
      });
      if (!sub || !sub.isActive || sub.admin.verificationStatus !== 'VERIFIED') {
        return { ok: false, code: 'INVALID' };
      }

      const accessToken = await jwtSign(
        {
          adminId: sub.adminId,
          subAdminId: sub.id,
          shopId: sub.shopId,
          permissions: sub.permissions as {
            canCreate: boolean;
            canEdit: boolean;
            canDelete: boolean;
            canViewReports: boolean;
          },
          name: sub.name,
          verificationStatus: sub.admin.verificationStatus,
          role: 'subadmin',
        },
        { expiresIn: '15m' }
      );

      await tx.refreshToken.create({
        data: {
          adminId: sub.adminId,
          subAdminId: sub.id,
          tokenHash: newHash,
          expiresAt,
          userAgent: opts.userAgent ?? undefined,
          ip: opts.ip ?? undefined,
        },
      });

      return { ok: true, accessToken, newRefreshRaw: newRaw, kind: 'subadmin' };
    }

    if (row.superAdminId) {
      const sa = await tx.superAdmin.findUnique({
        where: { id: row.superAdminId },
      });
      if (!sa) {
        return { ok: false, code: 'INVALID' };
      }

      const accessToken = await jwtSign(
        {
          id: sa.id,
          email: sa.email,
          role: 'superadmin',
        },
        { expiresIn: '15m' }
      );

      await tx.refreshToken.create({
        data: {
          superAdminId: sa.id,
          tokenHash: newHash,
          expiresAt,
          userAgent: opts.userAgent ?? undefined,
          ip: opts.ip ?? undefined,
        },
      });

      return { ok: true, accessToken, newRefreshRaw: newRaw, kind: 'superadmin' };
    }

    if (row.adminId) {
      const admin = await tx.admin.findUnique({
        where: { id: row.adminId },
      });
      if (!admin) {
        return { ok: false, code: 'INVALID' };
      }

      const mainShop = await tx.shop.findFirst({
        where: { adminId: admin.id, isMain: true },
      });
      const subscription = await tx.subscription.findFirst({
        where: { adminId: admin.id, isCurrent: true },
      });

      const accessToken = await jwtSign(
        {
          adminId: admin.id,
          shopId: mainShop?.id || null,
          verificationStatus: admin.verificationStatus,
          isActive: admin.isActive,
          planId: subscription?.planId || null,
          role: 'admin',
        },
        { expiresIn: '15m' }
      );

      await tx.refreshToken.create({
        data: {
          adminId: admin.id,
          tokenHash: newHash,
          expiresAt,
          userAgent: opts.userAgent ?? undefined,
          ip: opts.ip ?? undefined,
        },
      });

      return { ok: true, accessToken, newRefreshRaw: newRaw, kind: 'admin' };
    }

    return { ok: false, code: 'INVALID' };
  });
}

export async function revokeRefreshByRaw(db: PrismaClient, raw: string): Promise<void> {
  const tokenHash = hashRefreshToken(raw);
  await db.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllAdminRefresh(db: PrismaClient, adminId: string): Promise<void> {
  const now = new Date();
  const subs = await db.subAdmin.findMany({ where: { adminId }, select: { id: true } });
  const subIds = subs.map((s) => s.id);
  await db.refreshToken.updateMany({
    where: { revokedAt: null, adminId },
    data: { revokedAt: now },
  });
  if (subIds.length > 0) {
    await db.refreshToken.updateMany({
      where: { revokedAt: null, subAdminId: { in: subIds } },
      data: { revokedAt: now },
    });
  }
}

export async function revokeAllSubAdminRefresh(db: PrismaClient, subAdminId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { subAdminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSuperAdminRefresh(db: PrismaClient, superAdminId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { superAdminId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
