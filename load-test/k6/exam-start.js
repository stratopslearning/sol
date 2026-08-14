import { startQuiz, studentForVu, expectOk, fixture, VUS } from './helpers.js';

export const options = {
  scenarios: {
    examStart: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:quiz_start}': ['p(95)<3000'],
  },
};

export default function () {
  const student = studentForVu(__VU);
  const res = startQuiz(student, fixture.mcqQuizId, student.mcqAssignmentId);
  expectOk(res, 'start');
}
