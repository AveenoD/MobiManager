/**
 * Optional DB-backed recall checks. Enable with:
 *   S2_RECALL_INTEGRATION=1 DATABASE_URL=... npm run test:int
 */
import { describe, it, expect } from 'vitest';

const RUN = process.env.S2_RECALL_INTEGRATION === '1' && Boolean(process.env.DATABASE_URL);

describe.skipIf(!RUN)('S2 customers.recall integration', () => {
  it('is opt-in — seed data and assert HTTP recall in CI when ready', () => {
    expect(RUN).toBe(true);
  });
});
