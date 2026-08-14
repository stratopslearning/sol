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
    examSubmitSa: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '4m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{name:quiz_submit}': ['p(95)<90000'],
  },
};

export default function () {
  const student = studentForVu(__VU);
  const started = startQuiz(student, fixture.saQuizId, student.saAssignmentId);
  expectOk(started, 'start-before-sa-submit');
  const res = submitQuiz(
    student,
    fixture.saQuizId,
    student.saAssignmentId,
    fixture.saAnswers,
  );
  expectOk(res, 'submit-sa');
}
