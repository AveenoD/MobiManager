import { z } from 'zod';

export const DICT_KINDS = ['brand', 'model', 'category', 'issue', 'operator'] as const;
export type DictKind = (typeof DICT_KINDS)[number];

export const dictKindParamSchema = z.enum(DICT_KINDS);

export const dictSearchQuerySchema = z.object({
  q: z.string().max(200).optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).default(8),
});

export const dictPostBodySchema = z.object({
  value: z.string().min(1).max(500).trim(),
});
