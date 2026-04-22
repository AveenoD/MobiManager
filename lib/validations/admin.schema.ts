import { z } from 'zod';

export const verifyAdminSchema = z.object({
  adminId: z.string().uuid('Invalid admin ID'),
  status: z.enum(['VERIFIED', 'REJECTED']),
  note: z.string().optional(),
});

export const verificationNoteSchema = z.object({
  adminId: z.string().uuid('Invalid admin ID'),
  note: z.string().min(10, 'Note must be at least 10 characters when rejecting'),
});

export const planUpdateSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  billingType: z.enum(['MONTHLY', 'YEARLY']),
  adminId: z.string().uuid('Invalid admin ID'),
});

export type VerifyAdminInput = z.infer<typeof verifyAdminSchema>;
export type VerificationNoteInput = z.infer<typeof verificationNoteSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
