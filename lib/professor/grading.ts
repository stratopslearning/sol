/**
 * Professor grading reads (gradebook, attempts, attempt detail), shared by
 * the REST API and MCP tools. Every function here discloses education
 * records, so each logs to the audit trail.
 */
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import { parse as toCsv } from 'json2csv';

import { db } from '@/app/db';
import {
  attempts,
  professorSections,
  quizSections,
  quizzes,
  sections,
  studentSections,
  users,
} from '@/app/db/schema';
import { ApiError } from '@/lib/api/errors';
import { logAudit, logGradebookAccess } from '@/lib/audit';
import { activeOnly } from '@/lib/db/filters';
import type { UserData } from '@/lib/getOrCreateUser';
import { comparePersonsByLastName } from '@/lib/personName';
import { buildGradebookScoresForSection, fetchSubmittedAttemptsForProfessorSections } from '@/lib/professorVisibleAttempts';
import { professorCanAccessQuiz } from '@/lib/quizAccess';
import { assertTeachesSection } from '@/lib/professor/sections';

type ProfessorUser = Pick<UserData, 'id' | 'role' | 'clerkId'>;

function personName(p: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email || 'Unknown';
}

export type GradebookData = {
  section: { id: string; name: string; courseTitle: string | null };
  quizzes: { id: string; title: string }[];
  learners: {
    id: string;
    name: string;
    email: string | null;
    average: number | null;
    cells: Record<
      string,
      { score: number; maxScore: number; percentage: number; attemptId: string }
    >;
  }[];
};

export async function getSectionGradebook(
  user: ProfessorUser,
  sectionId: string,
): Promise<GradebookData> {
  await assertTeachesSection(user, sectionId);

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    with: { course: true },
  });
  if (!section) throw ApiError.notFound('Section not found');

  await logGradebookAccess({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    sectionId,
    role: user.role,
  });

  const studentEnrollments = await db.query.studentSections.findMany({
    where: and(
      eq(studentSections.sectionId, sectionId),
      eq(studentSections.status, 'ACTIVE'),
    ),
    with: { student: true },
  });
  const students = studentEnrollments
    .map((e) => e.student)
    .sort((a, b) => comparePersonsByLastName(a, b));

  const quizLinks = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizLinks
    .map((qs) => qs.quiz)
    .filter(
      (q): q is NonNullable<(typeof quizLinks)[0]['quiz']> =>
        q != null && q.deletedAt == null,
    );

  const scores = await buildGradebookScoresForSection({
    sectionId,
    quizIds: sectionQuizzes.map((q) => q.id),
    enrolledStudentIds: students.map((s) => s.id),
  });

  return {
    section: {
      id: section.id,
      name: section.name,
      courseTitle: section.course?.title ?? null,
    },
    quizzes: sectionQuizzes.map((q) => ({ id: q.id, title: q.title })),
    learners: students.map((student) => {
      const cells: GradebookData['learners'][number]['cells'] = {};
      const percentages: number[] = [];
      for (const quiz of sectionQuizzes) {
        const cell = scores[student.id]?.[quiz.id];
        if (cell) {
          cells[quiz.id] = cell;
          percentages.push(cell.percentage);
        }
      }
      return {
        id: student.id,
        name: personName(student),
        email: student.email,
        average:
          percentages.length > 0
            ? Math.round(
                percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
              )
            : null,
        cells,
      };
    }),
  };
}

export type AttemptSummary = {
  id: string;
  student: { id: string; name: string; email: string | null };
  section: { id: string; name: string };
  score: number | null;
  maxScore: number;
  percentage: number | null;
  passed: boolean | null;
  gradingStatus: string | null;
  submittedAt: Date | null;
};

export async function listQuizAttempts(
  user: ProfessorUser,
  quizId: string,
  options: { sectionId?: string } = {},
): Promise<AttemptSummary[]> {
  const allowed = await professorCanAccessQuiz(user, quizId);
  if (!allowed) throw ApiError.forbidden('You do not have access to this quiz');

  let sectionIds: string[];
  if (user.role === 'ADMIN') {
    const links = await db.query.quizSections.findMany({
      where: eq(quizSections.quizId, quizId),
    });
    sectionIds = links.map((l) => l.sectionId);
  } else {
    const enrollments = await db.query.professorSections.findMany({
      where: eq(professorSections.professorId, user.id),
    });
    sectionIds = enrollments.map((e) => e.sectionId);
  }

  const rows = await fetchSubmittedAttemptsForProfessorSections({
    quizId,
    professorSectionIds: sectionIds,
    restrictToSectionId: options.sectionId,
  });

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.attempts.list',
    targetType: 'quiz',
    targetId: quizId,
    metadata: {
      viewerRole: user.role,
      sectionId: options.sectionId ?? null,
      rowCount: rows.length,
    },
  });

  return rows.map((a) => ({
    id: a.id,
    student: {
      id: a.student.id,
      name: personName(a.student),
      email: a.student.email,
    },
    section: { id: a.section.id, name: a.section.name },
    score: a.score,
    maxScore: a.maxScore,
    percentage: a.percentage,
    passed: a.passed,
    gradingStatus: a.gradingStatus,
    submittedAt: a.submittedAt,
  }));
}

export type AttemptDetail = AttemptSummary & {
  quiz: { id: string; title: string };
  startedAt: Date;
  answers: unknown;
  gptFeedback: unknown;
};

export async function getAttemptDetail(
  user: ProfessorUser,
  attemptId: string,
): Promise<AttemptDetail> {
  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      student: true,
      quiz: { columns: { id: true, title: true } },
      section: { columns: { id: true, name: true } },
    },
  });
  if (!attempt) throw ApiError.notFound('Attempt not found');

  await assertTeachesSection(user, attempt.sectionId);

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.attempt.view',
    targetType: 'attempt',
    targetId: attemptId,
    metadata: { viewerRole: user.role },
  });

  return {
    id: attempt.id,
    student: {
      id: attempt.student.id,
      name: personName(attempt.student),
      email: attempt.student.email,
    },
    section: { id: attempt.section.id, name: attempt.section.name },
    quiz: { id: attempt.quiz.id, title: attempt.quiz.title },
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    passed: attempt.passed,
    gradingStatus: attempt.gradingStatus,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    answers: attempt.answers,
    gptFeedback: attempt.gptFeedback,
  };
}

/**
 * CSV of submitted attempts across the professor's sections. Mirrors
 * GET /api/professor/quiz/export (PROFESSOR only, audited).
 */
export async function exportResultsCsv(
  user: ProfessorUser,
  options: { quizId?: string; dateFrom?: string; dateTo?: string } = {},
): Promise<{ csv: string; rowCount: number }> {
  if (user.role !== 'PROFESSOR') {
    throw ApiError.forbidden('Only professors can export results');
  }

  const enrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
  });
  const sectionIds = enrollments.map((e) => e.sectionId);
  if (sectionIds.length === 0) throw ApiError.forbidden('No section access');

  const quizLinks = await db.query.quizSections.findMany({
    where: inArray(quizSections.sectionId, sectionIds),
  });
  const allowedQuizIds = quizLinks.map((qs) => qs.quizId);
  if (allowedQuizIds.length === 0) throw ApiError.forbidden('No quiz access');

  const whereConditions = [
    inArray(attempts.quizId, allowedQuizIds),
    isNotNull(attempts.submittedAt),
  ];
  if (options.quizId) {
    if (!allowedQuizIds.includes(options.quizId)) {
      throw ApiError.forbidden('Access denied for this quiz');
    }
    whereConditions.push(eq(attempts.quizId, options.quizId));
  }
  if (options.dateFrom) {
    whereConditions.push(gte(attempts.submittedAt, new Date(options.dateFrom)));
  }
  if (options.dateTo) {
    whereConditions.push(
      lte(attempts.submittedAt, new Date(options.dateTo + 'T23:59:59')),
    );
  }

  const results = await db
    .select({
      studentFirstName: users.firstName,
      studentLastName: users.lastName,
      studentEmail: users.email,
      quizTitle: quizzes.title,
      attemptDate: attempts.submittedAt,
      score: attempts.score,
      maxScore: attempts.maxScore,
    })
    .from(attempts)
    .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
    .innerJoin(users, eq(attempts.studentId, users.id))
    .where(and(...whereConditions))
    .orderBy(attempts.submittedAt);

  const attemptCounts = new Map<string, number>();
  const csvData = results.map((row) => {
    const key = `${row.studentEmail}-${row.quizTitle}`;
    attemptCounts.set(key, (attemptCounts.get(key) || 0) + 1);
    const fullName =
      [row.studentFirstName, row.studentLastName].filter(Boolean).join(' ') ||
      'Unknown';
    return {
      'Student Name': fullName,
      'Student Email': row.studentEmail,
      'Quiz Name': row.quizTitle,
      'Attempt Date': row.attemptDate
        ? new Date(row.attemptDate).toISOString()
        : 'N/A',
      Score: row.score ?? 0,
      'Max Score': row.maxScore ?? 0,
      'Attempt Number': attemptCounts.get(key) || 1,
    };
  });

  const csv =
    csvData.length > 0
      ? toCsv(csvData, {
          fields: [
            'Student Name',
            'Student Email',
            'Quiz Name',
            'Attempt Date',
            'Score',
            'Max Score',
            'Attempt Number',
          ],
        })
      : 'No submitted attempts matched the filters.';

  await logAudit({
    actorUserId: user.id,
    actorClerkId: user.clerkId,
    action: 'education.grades.export',
    targetType: 'quiz',
    targetId: options.quizId ?? 'all',
    metadata: {
      rowCount: csvData.length,
      dateFrom: options.dateFrom || null,
      dateTo: options.dateTo || null,
      sectionCount: sectionIds.length,
      via: 'mcp',
    },
  });

  return { csv, rowCount: csvData.length };
}
