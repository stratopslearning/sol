import { appRedirect } from '@/lib/serverRedirect';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { assignments, attempts, questions, quizzes } from '@/app/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { QuizTakeForm } from '@/components/quiz/QuizTakeForm';
import { activeOnly } from '@/lib/db/filters';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getQuizAvailability } from '@/lib/quizAvailability';
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
    appRedirect(`/dashboard/student?error=quiz_not_started&quizId=${quizId}&message=${encodeURIComponent('This quiz has not started yet.')}`);
  }
  if (endDate && now > endDate) {
    appRedirect(`/dashboard/student?error=quiz_ended&quizId=${quizId}&message=${encodeURIComponent('This quiz has ended.')}`);
  }

  // Fetch questions for this quiz
  const quizQuestions = await db.query.questions.findMany({
    where: eq(questions.quizId, quizId),
    orderBy: questions.order,
  });

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

  const inProgressAttempt = await db.query.attempts.findFirst({
    where: and(
      eq(attempts.quizId, quizId),
      eq(attempts.studentId, user.id),
      isNull(attempts.submittedAt),
    ),
  });

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
        description: quiz.description ? cleanQuizDescription(quiz.description) : undefined,
        timeLimit: quiz.timeLimit || undefined,
        endDate: quizEndDate ? quizEndDate.toISOString() : null,
        totalQuestions: quizQuestions.length,
      }}
      questions={quizQuestions.map(q => ({
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
