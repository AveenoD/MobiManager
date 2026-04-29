import { PrismaClient, Prisma } from '@prisma/client';
import { AuthPayload, AdminPayload, SubAdminPayload } from './jwt';
import { jwtVerify } from './jwt';

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
export async function setAdminContext(prisma: PrismaClient | Prisma.TransactionClient, adminId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.current_admin_id', ${adminId}, TRUE)`;
}

// Helper to set super admin context
export async function setSuperAdminContext(prisma: PrismaClient | Prisma.TransactionClient): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.is_super_admin', 'true', TRUE)`;
}

// Transaction wrapper with admin context
export async function withAdminContext<T>(
  adminId: string,
  fn: (db: PrismaClient | Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_admin_id', ${adminId}, TRUE)`;
    return fn(tx);
  });
}

// Transaction wrapper with super admin context
export async function withSuperAdminContext<T>(
  fn: (db: PrismaClient | Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.is_super_admin', 'true', TRUE)`;
    return fn(tx);
  });
}

// Verify token and extract adminId from request
export async function verifyAdminFromRequest(request: Request): Promise<{
  adminId: string;
  payload: AdminPayload | SubAdminPayload;
} | null> {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const token = extractTokenFromCookie(cookieHeader, 'admin_token');
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token);
    if (payload.role === 'admin') {
      return { adminId: payload.adminId, payload: payload as AdminPayload };
    }
    if (payload.role === 'subadmin') {
      return { adminId: payload.adminId, payload: payload as SubAdminPayload };
    }
    return null;
  } catch {
    return null;
  }
}

// Extract token from cookie string
function extractTokenFromCookie(cookieString: string, tokenName: string): string | null {
  const cookies = cookieString.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === tokenName) {
      return value;
    }
  }
  return null;
}