import { z } from 'zod';

export const createRepairSchema = z.object({
  shopId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, 'Valid Indian mobile number required'),
  deviceBrand: z.string().min(1).max(100),
  deviceModel: z.string().min(1).max(100),
  issueDescription: z.string().min(5, 'Please describe the issue').max(500),
  repairCost: z.number().min(0).default(0),
  customerCharge: z.number().min(0).default(0),
  advancePaid: z.number().min(0).default(0),
  estimatedDelivery: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
}).refine(
  (data) => data.advancePaid <= data.customerCharge,
  { message: 'Advance cannot exceed customer charge', path: ['advancePaid'] }
);

export const updateRepairSchema = z.object({
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  deviceBrand: z.string().max(100).optional(),
  deviceModel: z.string().max(100).optional(),
  issueDescription: z.string().min(5).max(500).optional(),
  repairCost: z.number().min(0).optional(),
  customerCharge: z.number().min(0).optional(),
  advancePaid: z.number().min(0).optional(),
  estimatedDelivery: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  reason: z.string().min(10, 'Reason required for any edit (min 10 chars)'),
});

export const statusUpdateSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED', 'CANCELLED']),
  reason: z.string().optional(),
  completionDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  finalAdvanceCollection: z.number().min(0).optional(),
}).refine(
  (data) => !(data.status === 'CANCELLED' && (!data.reason || data.reason.length < 10)),
  { message: 'Cancellation reason required (min 10 chars)', path: ['reason'] }
);

export const addPartSchema = z.object({
  productId: z.string().uuid().optional(),
  partName: z.string().min(1).max(200),
  qty: z.number().int().min(1),
  cost: z.number().min(0),
});

export const repairFilterSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_REPAIR', 'REPAIRED', 'DELIVERED', 'CANCELLED', 'PENDING_PICKUP']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  shopId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['receivedDate', 'customerName', 'status', 'pendingAmount', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateRepairInput = z.infer<typeof createRepairSchema>;
export type UpdateRepairInput = z.infer<typeof updateRepairSchema>;
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;
export type AddPartInput = z.infer<typeof addPartSchema>;
export type RepairFilterInput = z.infer<typeof repairFilterSchema>;
