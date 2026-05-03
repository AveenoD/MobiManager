/** Vertical-agnostic OCR kinds for `/api/ai/extract` (S6). */

export const OCR_KINDS = ['repair-intake', 'generic'] as const;
export type OcrKind = (typeof OCR_KINDS)[number];

export function isOcrKind(s: string): s is OcrKind {
  return (OCR_KINDS as readonly string[]).includes(s);
}

export function buildOcrPrompt(kind: OcrKind): string {
  if (kind === 'repair-intake') {
    return `
You are extracting structured data from a repair intake screenshot/photo for an Indian mobile/laptop repair shop.

Return ONLY valid JSON (no markdown). Keys MUST be exactly:
{
  "customerName": string|null,
  "customerPhone": string|null,
  "deviceBrand": string|null,
  "deviceModel": string|null,
  "issueDescription": string|null,
  "customerCharge": number|null,
  "advancePaid": number|null,
  "estimatedDeliveryDate": string|null,
  "notes": string|null,
  "confidence": {
    "customerPhone": number,
    "deviceModel": number,
    "issueDescription": number
  }
}

Rules:
- If a field is not present, return null.
- confidence values are 0..1.
`;
  }

  return `
Extract any readable text and obvious key-value pairs from this image.

Return ONLY valid JSON (no markdown):
{
  "title": string|null,
  "summary": string|null,
  "lines": string[],
  "confidence": { "summary": number }
}
Rules: confidence 0..1.
`;
}
