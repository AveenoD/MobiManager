import { z } from 'zod';
import { OCR_KINDS } from '../ocr/kinds';

const mimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const presignBodySchema = z.object({
  kind: z.enum(OCR_KINDS),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type PresignBody = z.infer<typeof presignBodySchema>;

export function extFromMime(mime: PresignBody['mime']): string {
  return mimeToExt[mime] ?? 'bin';
}

const sha256Hex = z.string().regex(/^[a-fA-F0-9]{64}$/, 'sha256 must be 64 hex chars');

export const aiExtractBodySchema = z.object({
  objectKey: z.string().min(1).max(512),
  sha256: sha256Hex,
  kind: z.enum(OCR_KINDS),
  shopId: z.string().uuid().optional(),
});

export type AiExtractBody = z.infer<typeof aiExtractBodySchema>;

export const aiConfirmBodySchema = z.object({
  extractionId: z.string().uuid(),
});

export type AiConfirmBody = z.infer<typeof aiConfirmBodySchema>;
