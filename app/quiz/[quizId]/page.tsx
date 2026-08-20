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
import { AppShell } from '@/components/layout/AppShell';
import { QuizTakeForm } from '@/components/quiz/QuizTakeForm';
import { QuizUnavailable } from '@/components/quiz/QuizUnavailable';
import { activeOnly } from '@/lib/db/filters';
import { isStudentEntitled } from '@/lib/featureFlags';
import { getOrCreateUser, type UserData } from '@/lib/getOrCreateUser';
import { getQuizAvailability } from '@/lib/quizAvailability';
import {
  availabilityReasonToBlockCode,
  type QuizBlockCode,
} from '@/lib/quizBlockCopy';
import { assertStudentCanOpenQuiz } from '@/lib/quizEnrollment';
import { resolveAttemptSectionId } from '@/lib/resolveAttemptSection';
import { isSectionConcluded } from '@/lib/sectionAvailability';
import { appRedirect } from '@/lib/serverRedirect';
import {
  cleanQuizDescription,
  formatDateTimeStable,
  normalizeDatabaseDate,
} from '@/lib/utils';

interface QuizPageProps {
  params: Promise<{ quizId: string }>;
}

function blocked(
  user: UserData,
  props: {
    code: QuizBlockCode;
    quizTitle?: string | null;
    opensAtLabel?: string | null;
    closedAtLabel?: string | null;
  },
) {
  return (
    <AppShell
      role="student"
      user={user}
      topbarEyebrow="Learner"
      topbarTitle={props.quizTitle || 'Quiz'}
    >
      <QuizUnavailable {...props} />
    </AppShell>
  );
}

export default async function QuizPage(props: QuizPageProps) {
  const params = await props.params;
  const quizId = params.quizId;

  const user = await getOrCreateUser();
  if (!user) appRedirect('/login');
  if (user.role !== 'STUDENT') appRedirect('/payment');
  if (!isStudentEntitled(user)) appRedirect('/payment');

  // Soft-deleted quizzes are treated as unavailable (do not dump to home).
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), activeOnly(quizzes.deletedAt)),
  });
  if (!quiz) return blocked(user, { code: 'quiz_unavailable' });

  const now = new Date();
  const startDate = normalizeDatabaseDate(quiz.startDate);
  const endDate = normalizeDatabaseDate(quiz.endDate);

  if (startDate && now < startDate) {
    return blocked(user, {
      code: 'quiz_not_started',
      quizTitle: quiz.title,
      opensAtLabel: formatDateTimeStable(startDate),
    });
  }
  if (endDate && now > endDate) {
    return blocked(user, {
      code: 'quiz_ended',
      quizTitle: quiz.title,
      closedAtLabel: formatDateTimeStable(endDate),
    });
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
  if (!open.allowed) {
    return blocked(user, { code: 'not_enrolled', quizTitle: quiz.title });
  }
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
    return blocked(user, { code: 'quiz_unavailable', quizTitle: quiz.title });
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
    return blocked(user, {
      code: 'section_concluded',
      quizTitle: quiz.title,
    });
  }

  const availability = getQuizAvailability(quiz, assignment, now);
  if (!availability.allowed && !inProgressAttempt) {
    return blocked(user, {
      code: availabilityReasonToBlockCode(availability.reason),
      quizTitle: quiz.title,
      opensAtLabel: startDate ? formatDateTimeStable(startDate) : null,
      closedAtLabel: endDate ? formatDateTimeStable(endDate) : null,
    });
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
