/**
 * S11 — POST /api/ai/extract (multipart) SLO sketch.
 * Run: k6 run __loadtest__/k6.ocr.js
 * Target: P95 < 6 s cold, < 200 ms cached — wire presign + cookie auth before staging soak.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<10000'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE}/api/health`);
  check(res, { '200': (r) => r.status === 200 });
  sleep(0.5);
}
