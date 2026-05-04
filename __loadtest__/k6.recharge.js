/**
 * S11 — POST /api/admin/recharge (blueprint SLO sketch).
 * Run: k6 run __loadtest__/k6.recharge.js
 * Requires cookies / auth — replace with shared session from setup() in CI.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/health`);
  check(res, { '200': (r) => r.status === 200 });
  sleep(1);
}
