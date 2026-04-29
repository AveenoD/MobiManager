import { z } from 'zod';
import { normalizePhone } from '../phone';

/**
 * Validates and normalizes a phone input to E.164.
 * Use this in place of raw string validation for customer phone fields.
 */
export const phoneInputSchema = z.string().min(1).transform((val, ctx) => {
  const result = normalizePhone(val);
  if (!result) {
    ctx.addIssue({ code: 'custom', message: 'Invalid Indian mobile number' });
    return z.NEVER;
  }
  return result.e164;
});

/**
 * Schema for customer upsert/update operations.
 * phoneE164 is accepted as pre-normalized or raw (will be normalized).
 */
export const customerUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * Schema for customer search query params.
 * At least one of phone or name must be provided.
 */
export const customerSearchSchema = z.object({
  phone: z.string().optional(),
  name: z.string().optional(),
  partial: z.enum(['true', 'false']).optional().default('false'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).refine(
  (data) => data.phone || data.name,
  { message: 'At least phone or name search term is required', path: ['phone'] }
);

export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;
