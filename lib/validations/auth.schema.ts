import { z } from 'zod';

export const superAdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const adminRegisterSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(150),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain at least one uppercase, one lowercase, one number, and one special character'
    ),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstNumber: z.string().optional(),
});

export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type AdminRegisterInput = z.infer<typeof adminRegisterSchema>;
