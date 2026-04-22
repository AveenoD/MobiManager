import { fileTypeFromBuffer } from 'file-type';
import path from 'path';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

// Magic bytes (actual file signature check)
const MAGIC_BYTES: Record<string, string> = {
  'image/jpeg': 'ffd8ff',
  'image/png': '89504e47',
  'application/pdf': '25504446',
};

export interface ValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

export async function validateDocumentFile(
  buffer: Buffer,
  originalName: string,
  maxSizeMB: number = 5
): Promise<ValidationResult> {

  // 1. Size check
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return {
      valid: false,
      error: `File too large. Max ${maxSizeMB}MB allowed.`,
    };
  }

  // 2. Extension check
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPG, PNG, PDF allowed.',
    };
  }

  // 3. MIME type from actual file content
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    return {
      valid: false,
      error: 'File content does not match allowed types.',
    };
  }

  // 4. Magic bytes check (deepest level)
  const hex = buffer.subarray(0, 4).toString('hex');
  const expectedMagic = MAGIC_BYTES[fileType.mime];
  if (!hex.startsWith(expectedMagic)) {
    return {
      valid: false,
      error: 'File signature invalid. Possible malicious file.',
    };
  }

  // 5. Extension must match actual content
  const mimeToExt: Record<string, string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf'],
  };
  const allowedExtsForMime = mimeToExt[fileType.mime] || [];
  if (!allowedExtsForMime.includes(ext)) {
    return {
      valid: false,
      error: 'File extension does not match file content.',
    };
  }

  return { valid: true, mimeType: fileType.mime };
}
