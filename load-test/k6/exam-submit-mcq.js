import {
  startQuiz,
  submitQuiz,
  studentForVu,
  expectOk,
  fixture,
  VUS,
} from './helpers.js';

export const options = {
  scenarios: {
    examSubmitMcq: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: __ENV.MAX_DURATION || '8m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:quiz_submit}': ['p(95)<5000'],
  },
};

export default function () {
  const student = studentForVu(__VU);
  const started = startQuiz(student, fixture.mcqQuizId, student.mcqAssignmentId);
  expectOk(started, 'start-before-submit');
  const res = submitQuiz(
    student,
    fixture.mcqQuizId,
    student.mcqAssignmentId,
    fixture.mcqAnswers,
  );
  expectOk(res, 'submit-mcq');
}
