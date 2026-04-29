import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'production', 'test']).default('development');

const cloudinarySchema = z.object({
  cloud_name: z.string().optional(),
  api_key: z.string().optional(),
  api_secret: z.string().optional(),
}).nullable().optional();

export const envSchema = z.object({
  // Required - app MUST fail to start if missing
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SUPER_ADMIN_JWT_SECRET: z.string().min(32, 'SUPER_ADMIN_JWT_SECRET must be at least 32 characters'),
  NODE_ENV: nodeEnvSchema,

  // Security
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  SA_ROUTE_SLUG: z.string().min(3).max(50).default('super-admin'),
  SA_ALLOWED_IPS: z.string().optional().default(''),

  // Upload limits (in MB)
  UPLOAD_MAX_SIZE_MB: z.coerce.number().min(1).max(100).default(5),

  // Cloudinary (all optional - only required for upload routes)
  CLOUDINARY_URL: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudinarySchema,
  NEXT_PUBLIC_CLOUDINARY_API_KEY: cloudinarySchema,
  CLOUDINARY_API_SECRET: cloudinarySchema,

  // App config
  NEXT_PUBLIC_APP_NAME: z.string().default('MobiManager'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  // AI
  GEMINI_API_KEY: z.string().optional(),

  // Redis (optional - will fall back to in-memory if not provided)
  REDIS_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let validatedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    console.error('❌ Environment validation failed:\n' + errors);
    console.error('\n💡 Fix your .env file or environment variables, then restart the server.');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  validatedEnv = result.data;
  return validatedEnv;
}

export function getEnv(): EnvConfig {
  return validatedEnv ?? validateEnv();
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

export function getAllowedOrigins(): string[] {
  const origins = getEnv().ALLOWED_ORIGINS;
  return origins ? origins.split(',').map((o) => o.trim()).filter(Boolean) : [];
}

export function getSaAllowedIps(): string[] {
  const ips = getEnv().SA_ALLOWED_IPS;
  return ips ? ips.split(',').map((o) => o.trim()).filter(Boolean) : [];
}
