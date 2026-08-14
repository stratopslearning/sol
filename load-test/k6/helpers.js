import { check } from 'k6';
import http from 'k6/http';

const fixturePath = __ENV.FIXTURE || '../fixture.json';
export const fixture = JSON.parse(open(fixturePath));

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const SECRET = __ENV.LOAD_TEST_SECRET;
export const VUS = Number(__ENV.VUS || 50);

if (!SECRET || SECRET.length < 16) {
  throw new Error('LOAD_TEST_SECRET must be set (min 16 chars)');
}

export function studentForVu(vu) {
  const students = fixture.students;
  return students[(vu - 1) % students.length];
}

export function loadHeaders(userId) {
  return {
    'Content-Type': 'application/json',
    'x-load-test-secret': SECRET,
    'x-load-test-user-id': userId,
  };
}

export function url(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  const withBase = p.startsWith('/learning') ? p : `/learning${p}`;
  return `${BASE_URL}${withBase}`;
}

export function startQuiz(student, quizId, assignmentId) {
  return http.post(
    url(`/api/quiz/${quizId}/start`),
    JSON.stringify({ assignmentId }),
    { headers: loadHeaders(student.id), tags: { name: 'quiz_start' }, timeout: '120s' },
  );
}

export function saveProgress(student, quizId, assignmentId, answers) {
  return http.patch(
    url(`/api/quiz/${quizId}/progress`),
    JSON.stringify({ assignmentId, answers }),
    { headers: loadHeaders(student.id), tags: { name: 'quiz_progress' }, timeout: '60s' },
  );
}

export function submitQuiz(student, quizId, assignmentId, answers) {
  return http.post(
    url(`/api/quiz/${quizId}/submit`),
    JSON.stringify({ assignmentId, answers, autoSubmitted: false }),
    { headers: loadHeaders(student.id), tags: { name: 'quiz_submit' }, timeout: '120s' },
  );
}

export function expectOk(res, label) {
  const ok = check(res, {
    [`${label} status 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  if (!ok) {
    console.error(`${label} failed: ${res.status} ${res.body}`);
  }
  return ok;
}
