import { z } from 'zod';

export const createRechargeSchema = z.object({
  shopId: z.string().uuid(),
  serviceType: z.enum([
    'MOBILE_RECHARGE',
    'DTH',
    'ELECTRICITY',
    'MONEY_TRANSFER',
    'OTHER'
  ]),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Valid Indian mobile number required'),
  beneficiaryNumber: z.string().min(1).max(50),
  operator: z.string().min(1).max(100),
  amount: z.number().positive('Amount must be positive'),
  commissionEarned: z.number().min(0).default(0),
  transactionRef: z.string().max(100).optional(),
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED']).default('SUCCESS'),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.commissionEarned <= data.amount,
  {
    message: 'Commission cannot exceed transaction amount',
    path: ['commissionEarned'],
  }
);

export const rechargeFilterSchema = z.object({
  period: z.enum(['TODAY', 'WEEK', 'MONTH', 'CUSTOM']).optional(),
  serviceType: z.enum([
    'MOBILE_RECHARGE',
    'DTH',
    'ELECTRICITY',
    'MONEY_TRANSFER',
    'OTHER'
  ]).optional(),
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  shopId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateRechargeSchema = z.object({
  status: z.enum(['SUCCESS', 'PENDING', 'FAILED']),
  transactionRef: z.string().max(100).optional(),
  commissionEarned: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
  reason: z.string().min(10, 'Reason required for any edit (min 10 chars)'),
});

export type CreateRechargeInput = z.infer<typeof createRechargeSchema>;
export type RechargeFilterInput = z.infer<typeof rechargeFilterSchema>;
export type UpdateRechargeInput = z.infer<typeof updateRechargeSchema>;