/**
 * Writes prisma/migrations/<ts>_s5_search_columns/migration.sql (UTF-8)
 * including tx_to_latn + Customer.search + GIN index.
 *
 * Run: node scripts/write-s5-migration.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { Sanscript } = require('@indic-transliteration/sanscript');

const root = path.resolve(__dirname, '..');

const consonants =
  'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहक़ख़ग़ज़ड़ढ़फ़'.split('');
const matras = ['', 'ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', 'ँ'];
const halant = '्';
const indepVowels = 'अआइईउऊऋएऐओऔ'.split('');

const pairMap = new Map();

function addPair(from) {
  if (!from || from.length === 0) return;
  let lat;
  try {
    lat = Sanscript.t(from, 'devanagari', 'hk').toLowerCase();
  } catch {
    return;
  }
  if (lat === from) return;
  if (!pairMap.has(from) || pairMap.get(from).length < lat.length) {
    pairMap.set(from, lat);
  }
}

for (const c of consonants) {
  for (const m of matras) {
    addPair(c + m);
  }
}
for (const v of indepVowels) {
  addPair(v);
}
for (const c1 of consonants) {
  for (const c2 of consonants) {
    addPair(c1 + halant + c2);
  }
}
pairMap.set('ॅ', 'e');
pairMap.set('ॉ', 'o');

const pairs = [...pairMap.entries()].sort((a, b) => b[0].length - a[0].length);

function sqlEscape(s) {
  return s.replace(/'/g, "''");
}

let expr = "lower(trim(coalesce(input, '')))";
for (const [from, to] of pairs) {
  expr = `replace(${expr}, '${sqlEscape(from)}', '${sqlEscape(to)}')`;
}

const txFn = `
CREATE OR REPLACE FUNCTION public.tx_to_latn(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $fn$
  SELECT ${expr};
$fn$;
`.trim();

const migrationDir = path.join(root, 'prisma', 'migrations', '20260503180000_s5_search_columns');
fs.mkdirSync(migrationDir, { recursive: true });

const migrationSql = `-- S5: cross-script customer name search (IMMUTABLE tx_to_latn + generated search + GIN trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

${txFn}

ALTER TABLE "Customer"
  ADD COLUMN search text GENERATED ALWAYS AS (
    lower(trim(coalesce("name", ''))) || ' ' ||
    lower(trim(coalesce(public.tx_to_latn(coalesce("name", '')), '')))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_customer_search_trgm
  ON "Customer" USING gin (search gin_trgm_ops);
`;

const outPath = path.join(migrationDir, 'migration.sql');
fs.writeFileSync(outPath, migrationSql, 'utf8');
console.log('Wrote', outPath, 'pairs', pairs.length, 'bytes', fs.statSync(outPath).size);
