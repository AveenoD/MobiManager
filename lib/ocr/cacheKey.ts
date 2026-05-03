export function ocrRedisCacheKey(sha256Hex: string): string {
  return `ocr:sha:${sha256Hex.toLowerCase()}`;
}
