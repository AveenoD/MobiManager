/**
 * S1 — verify custom ESLint rules fire on the sentinel file.
 * Expects ESLint exit code 1 and both rule IDs in stdout/stderr.
 */

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const BASE = path.join(__dirname, '..');

const result = spawnSync(
  'npx',
  [
    'eslint',
    '__lint_probes__/sentinel-violations.ts',
    '-c',
    '.eslintrc.probe.cjs',
    '--no-eslintrc',
    '--max-warnings',
    '0',
  ],
  {
    cwd: BASE,
    encoding: 'utf-8',
    shell: true,
  }
);

const out = `${result.stdout || ''}\n${result.stderr || ''}`;

console.log(out.trim() || '(no eslint output)');

const hasRaw = out.includes('no-raw-prisma-outside-context');
const hasFindMany = out.includes('no-findMany-without-select');

if (result.status === 1 && hasRaw && hasFindMany) {
  console.log('\n✅ lint:probes — sentinel hit both custom rules (exit 1 as expected).');
  process.exit(0);
}

if (result.status === 0) {
  console.error('\n❌ lint:probes — expected ESLint to fail on sentinel (exit 1).');
  process.exit(1);
}

console.error(
  `\n❌ lint:probes — unexpected ESLint exit ${result.status}. ` +
    `Rules in output: raw=${hasRaw} findMany=${hasFindMany}`
);
process.exit(result.status ?? 1);
