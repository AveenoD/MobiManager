/**
 * S11 — OpenAPI hygiene gate.
 * Ensures deprecated paths are removed from the canonical spec. When zod→OpenAPI
 * is wired, extend this script to emit `docs/openapi.yaml` deterministically.
 *
 * CI: `npx tsx scripts/build-openapi.ts && git diff --exit-code docs/openapi.yaml`
 */
import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const specPath = path.join(root, 'docs', 'openapi.yaml');

const banned = ['/api/admin/ai/extract/repair'];

function main(): void {
  const raw = fs.readFileSync(specPath, 'utf8');
  for (const p of banned) {
    if (raw.includes(p)) {
      console.error(`[build-openapi] Remove legacy path from spec: ${p}`);
      process.exit(1);
    }
  }
  console.log('[build-openapi] OK:', specPath);
}

main();
