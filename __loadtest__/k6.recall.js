/**
 * S11 — GET /api/customers/recall (blueprint SLO sketch).
 * Run: k6 run __loadtest__/k6.recall.js
 * Target: P95 < 80 ms cold, < 20 ms hot (tune thresholds after baseline).
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/health`);
  check(res, { '200': (r) => r.status === 200 });
  sleep(0.3);
}
