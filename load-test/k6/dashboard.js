import { check, sleep } from 'k6';
import http from 'k6/http';

import { loadHeaders, studentForVu, url, VUS } from './helpers.js';

export const options = {
  scenarios: {
    dashboard: {
      executor: 'constant-vus',
      vus: Math.min(VUS, 100),
      duration: __ENV.DURATION || '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  const student = studentForVu(__VU);
  const headers = loadHeaders(student.id);
  const home = http.get(url('/dashboard/student'), {
    headers,
    tags: { name: 'student_dashboard' },
  });
  const quizzes = http.get(url('/dashboard/student/quizzes'), {
    headers,
    tags: { name: 'student_quizzes' },
  });
  check(home, { 'dashboard 2xx': (r) => r.status >= 200 && r.status < 400 });
  check(quizzes, { 'quizzes 2xx': (r) => r.status >= 200 && r.status < 400 });
  sleep(1);
}
