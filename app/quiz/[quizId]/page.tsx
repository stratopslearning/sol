import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  assignments,
  attempts,
  questions,
  quizSections,
  quizzes,
  sections,
} from '@/app/db/schema';
import { QuizTakeForm } from '@/components/quiz/QuizTakeForm';
import { activeOnly } from '@/lib/db/filters';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { getQuizAvailability } from '@/lib/quizAvailability';
import { assertStudentCanOpenQuiz } from '@/lib/quizEnrollment';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';
import {
  isSectionConcluded,
  SECTION_CONCLUDED_MESSAGE,
} from '@/lib/sectionAvailability';
import { appRedirect } from '@/lib/serverRedirect';
import { cleanQuizDescription, normalizeDatabaseDate } from '@/lib/utils';

interface QuizPageProps {
  params: Promise<{ quizId: string }>;
}

export default async function QuizPage(props: QuizPageProps) {
  const params = await props.params;
  const quizId = params.quizId;

  const user = await getOrCreateUser();
  if (!user) appRedirect('/login');
  if (user.role !== 'STUDENT') appRedirect('/payment');
  if (!isStudentEntitled(user)) appRedirect('/payment');

  // Fetch quiz details. Soft-deleted (deletedAt set) quizzes are treated as
  // not found to keep the redirect behavior identical for students.
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!quiz) appRedirect('/dashboard/student');

  // Validate quiz availability dates
  // Normalize dates to ensure correct UTC comparison
  const now = new Date();
  const startDate = normalizeDatabaseDate(quiz.startDate);
  const endDate = normalizeDatabaseDate(quiz.endDate);

  if (startDate && now < startDate) {
    appRedirect(
      `/dashboard/student?error=quiz_not_started&quizId=${quizId}&message=${encodeURIComponent('This quiz has not started yet.')}`,
    );
  }
  if (endDate && now > endDate) {
    appRedirect(
      `/dashboard/student?error=quiz_ended&quizId=${quizId}&message=${encodeURIComponent('This quiz has ended.')}`,
    );
  }

  // Enrollment before questions — unenrolled students must not see the bank
  // or get a lazy assignment row.
  const quizSectionLinks = await db.query.quizSections.findMany({
    where: eq(quizSections.quizId, quizId),
  });
  const quizSectionIds = quizSectionLinks.map((qs) => qs.sectionId);
  const resolvedSectionId = await resolveAttemptSectionId(
    user.id,
    quizSectionIds,
  );
  const open = assertStudentCanOpenQuiz(resolvedSectionId);
  if (!open.allowed) appRedirect('/dashboard/student');
  const sectionId = open.sectionId;

  // Fetch or create assignment (upsert-safe for concurrent page loads in dev).
  const assignmentWhere = and(
    eq(assignments.quizId, quizId),
    eq(assignments.studentId, user.id),
  );
  let assignment = await db.query.assignments.findFirst({
    where: assignmentWhere,
  });
  if (!assignment) {
    await db
      .insert(assignments)
      .values({
        quizId,
        studentId: user.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing({
        target: [assignments.quizId, assignments.studentId],
      });
    assignment = await db.query.assignments.findFirst({
      where: assignmentWhere,
    });
  }
  if (!assignment) {
    appRedirect('/dashboard/student');
  }

  const [quizQuestions, inProgressAttempt, section] = await Promise.all([
    db.query.questions.findMany({
      where: eq(questions.quizId, quizId),
      orderBy: questions.order,
    }),
    db.query.attempts.findFirst({
      where: and(
        eq(attempts.quizId, quizId),
        eq(attempts.studentId, user.id),
        isNull(attempts.submittedAt),
      ),
    }),
    db.query.sections.findFirst({
      where: eq(sections.id, sectionId),
    }),
  ]);

  if (isSectionConcluded(section, now) && !inProgressAttempt) {
    appRedirect(
      `/dashboard/student?error=section_concluded&quizId=${quizId}&message=${encodeURIComponent(SECTION_CONCLUDED_MESSAGE)}`,
    );
  }

  const availability = getQuizAvailability(quiz, assignment, now);
  if (!availability.allowed && !inProgressAttempt) {
    const messages = {
      quizNotStarted: 'This quiz has not started yet.',
      quizEnded: 'This quiz has ended.',
      dueDatePassed: 'The due date for this assignment has passed.',
    } as const;
    const errorParam =
      availability.reason === 'quizNotStarted'
        ? 'quiz_not_started'
        : availability.reason === 'quizEnded'
          ? 'quiz_ended'
          : 'due_date_passed';
    appRedirect(
      `/dashboard/student?error=${errorParam}&quizId=${quizId}&message=${encodeURIComponent(messages[availability.reason])}`,
    );
  }

  const quizEndDate = normalizeDatabaseDate(quiz.endDate);

  return (
    <div className="bg-paper text-ink min-h-screen">
      <QuizTakeForm
        quiz={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description
            ? cleanQuizDescription(quiz.description)
            : undefined,
          timeLimit: quiz.timeLimit || undefined,
          endDate: quizEndDate ? quizEndDate.toISOString() : null,
          totalQuestions: quizQuestions.length,
        }}
        questions={quizQuestions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options:
            typeof q.options === 'string'
              ? JSON.parse(q.options)
              : Array.isArray(q.options)
                ? q.options
                : undefined,
          order: q.order,
          points: q.points,
        }))}
        assignmentId={assignment.id}
        userId={user.id}
        userRole={user.role}
      />
    </div>
  );
}
