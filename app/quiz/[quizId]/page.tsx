import { appRedirect } from '@/lib/serverRedirect';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, assignments } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { QuizTakeForm } from '@/components/quiz/QuizTakeForm';
import { activeOnly } from '@/lib/db/filters';
import { isStudentEntitled } from '@/lib/featureFlags';
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

  // Fetch assignment for this student
  let assignment = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.quizId, quizId),
      eq(assignments.studentId, user.id)
    ),
  });
  if (!assignment) {
    const [newAssignment] = await db.insert(assignments).values({
      quizId,
      studentId: user.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).returning();
    assignment = newAssignment;
  }

  return (
    <div className="bg-paper text-ink min-h-screen">
      <QuizTakeForm
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description ? cleanQuizDescription(quiz.description) : undefined,
        timeLimit: quiz.timeLimit || undefined,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
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
