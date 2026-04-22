import { z } from 'zod';

export const adminRegisterSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(150, 'Shop name too long'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100, 'Owner name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Valid Indian mobile number required (10 digits starting with 6-9)'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must contain uppercase, lowercase, number, and special character (@$!%*?&)'
    ),
  confirmPassword: z.string(),
  city: z.string().min(2, 'City must be at least 2 characters'),
  state: z.string().min(2, 'State must be at least 2 characters'),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyAdminSchema = z.object({
  adminId: z.string().uuid('Invalid admin ID'),
  action: z.enum(['verify', 'reject']),
  reason: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Must contain uppercase, lowercase, number, and special character (@$!%*?&)'
    ),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ['confirmNewPassword'],
});

export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type VerifyAdminInput = z.infer<typeof verifyAdminSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
