import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Serves the canonical `docs/openapi.yaml` for Swagger UI (`/api/docs`).
 */
export async function GET() {
  const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
  const raw = await readFile(specPath, 'utf8');
  return new NextResponse(raw, {
    headers: {
      'Content-Type': 'application/yaml; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
