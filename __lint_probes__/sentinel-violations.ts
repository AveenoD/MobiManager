/**
 * Deliberately violates S1 custom ESLint rules so `npm run lint:probes` can
 * assert both rule IDs appear when ESLint exits with an error.
 *
 * This directory is ignored by `next lint` (see `.eslintrc.cjs` ignorePatterns).
 */

import { prisma } from '../lib/db';

// VIOLATION — mobimgr/no-findMany-without-select (warn): unbounded findMany
void prisma.admin.findMany();

// VIOLATION — mobimgr/no-raw-prisma-outside-context (error): bare prisma outside tenant context
void prisma.admin.findFirst();

export {};
