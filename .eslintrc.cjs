/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * Custom Prisma rules are registered but left off until call sites are migrated (S10).
 * `npm run lint:probes` uses `.eslintrc.probe.cjs` to assert rules fire on the sentinel file.
 */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  plugins: ['mobimgr'],
  ignorePatterns: ['node_modules/', '.next/', 'out/', '__lint_probes__/**'],
  rules: {
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/jsx-key': 'off',
    'mobimgr/no-raw-prisma-outside-context': 'off',
    'mobimgr/no-findMany-without-select': 'off',
  },
  overrides: [
    {
      files: ['eslint-rules/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
