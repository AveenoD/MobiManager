/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * ESLint config used only by `npm run lint:probes` on __lint_probes__.
 * Enables S1 custom rules at error/warn so the sentinel must fail CI-style.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['mobimgr'],
  rules: {
    'mobimgr/no-raw-prisma-outside-context': 'error',
    'mobimgr/no-findMany-without-select': 'warn',
  },
};
