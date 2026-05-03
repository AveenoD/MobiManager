/**
 * eslint-rules/index.js
 *
 * Wraps the custom ESLint rules as a proper ESLint plugin so they can be
 * registered via `plugins: ['mobimgr']` and used as `mobimgr/no-raw-prisma-outside-context`.
 */

'use strict';

const noRawPrisma = require('./no-raw-prisma-outside-context.js');
const noFindMany = require('./no-findMany-without-select.js');

module.exports = {
  meta: {
    name: 'mobimgr',
    version: '0.1.0',
    schemas: [],
  },
  rules: {
    'no-raw-prisma-outside-context': noRawPrisma,
    'no-findMany-without-select': noFindMany,
  },
};