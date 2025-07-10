import { redirect } from 'next/navigation';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { db } from '@/app/db';
import { quizzes, questions, assignments } from '@/app/db/schema';
import { eq, and } from 'drizzle-orm';
import { QuizTakeForm } from '@/components/quiz/QuizTakeForm';

interface QuizPageProps {
  params: Promise<{ quizId: string }>;
}

export default async function QuizPage(props: QuizPageProps) {
  const params = await props.params;
  const quizId = params.quizId;

  const user = await getOrCreateUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT' || !user.paid) redirect('/payment');

  // Fetch quiz details
  const quiz = await db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
    with: { course: true },
  });
  if (!quiz) redirect('/dashboard/student');

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

  // Only pass serializable data to the client
  return (
    <QuizTakeForm
      quiz={{
        id: quiz.id,
        title: quiz.title,
        description: quiz.description || undefined,
        timeLimit: quiz.timeLimit || undefined,
        passingScore: quiz.passingScore || undefined,
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
    />
  );
} 