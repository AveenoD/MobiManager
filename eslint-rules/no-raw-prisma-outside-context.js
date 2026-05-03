/**
 * ESLint rule: no-raw-prisma-outside-context
 *
 * Disallows bare `prisma.<model>.<op>()` calls outside tenant context helpers.
 * Prisma 5+ uses nested MemberExpression: prisma.admin.findMany().
 */

'use strict';

const DB_CONTEXT_HELPERS = new Set([
  'withAdminContext',
  'withSuperAdminContext',
  'setAdminContext',
  'setSuperAdminContext',
]);

const SAFE_METHODS = new Set([
  '$connect',
  '$disconnect',
  '$executeRaw',
  '$executeRawUnsafe',
  '$queryRaw',
  '$queryRawUnsafe',
  '$on',
  '$use',
]);

const DB_FILE = 'lib/db.ts';

/**
 * @returns {{ root: string, parts: string[] } | null}
 */
function getPrismaCallInfo(node) {
  if (node.type !== 'CallExpression') return null;
  let expr = node.callee;
  if (expr.type !== 'MemberExpression') return null;

  const parts = [];
  while (expr && expr.type === 'MemberExpression') {
    const key =
      expr.property?.type === 'Identifier'
        ? expr.property.name
        : expr.property?.type === 'Literal'
          ? String(expr.property.value)
          : null;
    if (key) parts.unshift(key);
    expr = expr.object;
  }

  if (!expr || expr.type !== 'Identifier') return null;
  if (expr.name !== 'prisma' && expr.name !== 'db') return null;
  if (parts.length === 0) return null;

  return { root: expr.name, parts };
}

function isPrismaReference(node) {
  return getPrismaCallInfo(node) !== null;
}

function isSafeCall(node) {
  const info = getPrismaCallInfo(node);
  if (!info) return false;
  const { parts } = info;
  const method = parts[parts.length - 1];

  if (SAFE_METHODS.has(method)) return true;
  if (method === '$transaction') return true;

  return false;
}

function isInsideContextHelper(node, ancestors) {
  for (let i = ancestors.length - 1; i >= 0; i--) {
    const ancestor = ancestors[i];
    if (ancestor.type === 'CallExpression' && ancestor.callee) {
      const calleeName =
        ancestor.callee.type === 'Identifier'
          ? ancestor.callee.name
          : ancestor.callee.type === 'MemberExpression'
            ? ancestor.callee.property?.name
            : null;
      if (calleeName && DB_CONTEXT_HELPERS.has(calleeName)) return true;

      if (calleeName === '$transaction') return true;
    }
  }
  return false;
}

function isInsideDBFile(context) {
  const filename = context.getFilename?.() ?? '';
  return filename.endsWith(DB_FILE);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow bare prisma calls outside RLS context helpers',
      url: 'https://github.com/anthropics/claude-code',
    },
    fixable: null,
    schema: [],
    messages: {
      noRawPrisma:
        'Prisma call "{{ method }}" on model "{{ model }}" must be inside a tenant context helper (withAdminContext / withSuperAdminContext / $transaction). Raw prisma calls bypass RLS and can leak cross-tenant data.',
    },
  },

  create(context) {
    function checkNode(node, ancestors = []) {
      if (node.type !== 'CallExpression') return;
      if (!isPrismaReference(node)) return;
      if (isInsideDBFile(context)) return;
      if (isSafeCall(node)) return;

      const fullAncestors = [node, ...ancestors];
      if (isInsideContextHelper(node, fullAncestors.slice(0, - 1))) return;

      const info = getPrismaCallInfo(node);
      const parts = info.parts;
      const method = parts[parts.length - 1];
      const model = parts.length >= 2 ? parts[parts.length - 2] : '?';

      context.report({
        node,
        messageId: 'noRawPrisma',
        data: { method, model },
      });
    }

    return {
      CallExpression(node) {
        checkNode(node, []);
      },
      'CallExpression CallExpression': function (node) {
        const outer = node.parent;
        if (
          outer?.type === 'CallExpression' &&
          outer?.callee?.type === 'MemberExpression' &&
          outer?.callee?.property?.name === '$transaction'
        ) {
          checkNode(node, [outer]);
        }
      },
    };
  },
};
