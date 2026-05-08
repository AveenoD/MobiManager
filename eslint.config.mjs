import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import mobimgr from 'eslint-plugin-mobimgr';

export default [
  ...nextCoreWebVitals,
  {
    plugins: { mobimgr },
    ignores: ['node_modules/', '.next/', 'out/', '__lint_probes__/**'],
    rules: {
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/jsx-key': 'off',
      'mobimgr/no-raw-prisma-outside-context': 'off',
      'mobimgr/no-findMany-without-select': 'off',
    },
  },
  {
    files: ['eslint-rules/**/*.js'],
    rules: {
      'no-console': 'off',
    },
  },
];

