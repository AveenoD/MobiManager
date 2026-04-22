import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

// Helper to set RLS context for admin isolation
export async function setAdminContext(prisma: PrismaClient | Prisma.TransactionClient): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.current_admin_id', current_setting('app.current_admin_id', true), TRUE)`;
}

// Helper to set super admin context
export async function setSuperAdminContext(prisma: PrismaClient | Prisma.TransactionClient): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.is_super_admin', 'true', TRUE)`;
}

// Transaction wrapper with admin context
export async function withAdminContext<T>(
  adminId: string,
  fn: (prisma: PrismaClient | Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_admin_id', ${adminId}, TRUE)`;
    return fn(tx);
  });
}

// Transaction wrapper with super admin context
export async function withSuperAdminContext<T>(
  fn: (prisma: PrismaClient | Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'true', TRUE)`;
    return fn(tx);
  });
}