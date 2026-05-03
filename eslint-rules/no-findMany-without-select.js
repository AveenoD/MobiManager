/**
 * ESLint rule: no-findMany-without-select
 *
 * Disallows `findMany()` / `findRaw()` calls that omit both `select` and a `take` limit.
 * These patterns can accidentally load unbounded result sets from large tables,
 * causing memory pressure and latency spikes.
 *
 * The exception: a `take` value (e.g. `findMany({ take: 100 })`) acts as an explicit
 * cap. Explicit `select` is preferred because it documents intent and reduces data transfer.
 *
 * Does NOT apply to: `findFirst()`, `findUnique()`, `findMany({ where: { id: X } })` —
 * these are inherently bounded.
 */

'use strict';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'findMany calls should include select or a take limit',
      url: 'https://github.com/anthropics/claude-code',
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          maxTake: { type: 'number', default: 1000 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noSelectOrTake:
        'findMany() has no `select` and no `take` limit. ' +
        'Add `select: { ... }` or `take: <number>` to avoid unbounded result sets. ' +
        'Unbounded queries can cause memory pressure and latency spikes on large tables.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const maxTake = options.maxTake ?? 1000;

    function getArgOptions(node) {
      // findMany({ where, select, take, ... })
      if (node.arguments?.length >= 1) {
        const arg = node.arguments[0];
        if (arg.type === 'ObjectExpression') {
          const opts = {};
          for (const prop of arg.properties ?? []) {
            if (prop.type === 'ObjectProperty' || prop.type === 'Property') {
              const keyName =
                prop.key.type === 'Identifier' ? prop.key.name : prop.key?.value;
              if (keyName) opts[keyName] = prop.value;
            }
          }
          return opts;
        }
      }
      return null;
    }

    function hasSelect(opts) {
      return opts?.select !== undefined;
    }

    function hasSafeTake(opts) {
      if (!opts?.take) return false;
      const takeVal = opts.take;
      // Literal number within safe limit
      if (takeVal?.type === 'Literal' && typeof takeVal.value === 'number') {
        return takeVal.value > 0 && takeVal.value <= maxTake;
      }
      // Even a variable take is better than no take — flag only in extreme cases
      return true;
    }

    function isPrismaFindMany(node) {
      return (
        node.type === 'CallExpression' &&
        node.callee?.type === 'MemberExpression' &&
        node.callee.property?.type === 'Identifier' &&
        ['findMany', 'findRaw', 'findManyAndCount'].includes(node.callee.property.name)
      );
    }

    function checkFindMany(node) {
      const opts = getArgOptions(node);

      // Allow if select is present
      if (hasSelect(opts)) return;
      // Allow if take is present and within safe limit
      if (hasSafeTake(opts)) return;

      context.report({ node, messageId: 'noSelectOrTake' });
    }

    return {
      CallExpression(node) {
        if (isPrismaFindMany(node)) checkFindMany(node);
      },
    };
  },
};