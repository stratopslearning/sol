import { sleep } from 'k6';

import {
  saveProgress,
  startQuiz,
  studentForVu,
  expectOk,
  fixture,
  VUS,
} from './helpers.js';

const DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    examProgress: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:quiz_progress}': ['p(95)<1000'],
  },
};

export default function () {
  const student = studentForVu(__VU);
  // Resume/create the attempt, then autosave like the 800ms debounce (we use 2s).
  const started = startQuiz(student, fixture.mcqQuizId, student.mcqAssignmentId);
  expectOk(started, 'start-before-progress');
  const res = saveProgress(
    student,
    fixture.mcqQuizId,
    student.mcqAssignmentId,
    fixture.mcqAnswers,
  );
  expectOk(res, 'progress');
  sleep(2);
}
