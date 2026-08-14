import { check, sleep } from 'k6';
import http from 'k6/http';

import { fixture, loadHeaders, url, VUS } from './helpers.js';

export const options = {
  scenarios: {
    professorResults: {
      executor: 'constant-vus',
      vus: Math.min(Math.max(VUS, 1), 5),
      duration: __ENV.DURATION || '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  const headers = loadHeaders(fixture.professorId);
  const res = http.get(
    url(`/dashboard/professor/quiz/${fixture.mcqQuizId}/results`),
    { headers, tags: { name: 'professor_results' } },
  );
  check(res, { 'results 2xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(2);
}
