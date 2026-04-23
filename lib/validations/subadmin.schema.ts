import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(2).max(150),
  address: z.string().optional(),
  city: z.string().min(2).max(100),
});

export const updateShopSchema = createShopSchema.partial();

export const permissionsSchema = z.object({
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canViewReports: z.boolean(),
}).refine(
  (p) => !(p.canDelete === true && p.canEdit === false),
  {
    message: 'Cannot have delete permission without edit permission',
    path: ['canDelete'],
  }
);

export const createSubAdminSchema = z.object({
  shopId: z.string().uuid('Valid shop required'),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid Indian mobile number required'),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must have uppercase, lowercase, number, special char'
    ),
  permissions: permissionsSchema,
});

export const updateSubAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  shopId: z.string().uuid().optional(),
  permissions: permissionsSchema.optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must have uppercase, lowercase, number, special char'
    ),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }
);

export const subAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type PermissionsInput = z.infer<typeof permissionsSchema>;
export type CreateSubAdminInput = z.infer<typeof createSubAdminSchema>;
export type UpdateSubAdminInput = z.infer<typeof updateSubAdminSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SubAdminLoginInput = z.infer<typeof subAdminLoginSchema>;
