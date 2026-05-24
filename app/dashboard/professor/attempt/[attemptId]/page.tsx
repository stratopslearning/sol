import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/app/db";
import {
  attempts,
  professorSections,
  questions,
} from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { GPTFeedbackDisplay } from "@/components/quiz/GPTFeedbackDisplay";
import { RegradeAttemptButton } from "@/components/quiz/RegradeAttemptButton";
import { Badge } from "@/components/ui/badge";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import {
  buildLegacyQuestionKeyMap,
  resolveAttemptAnswer,
  resolveAttemptFeedback,
} from "@/lib/quizAttemptAnswers";
import { isFallbackGradingFeedback } from "@/lib/regradeAttempt";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: {
      student: true,
      quiz: { with: { questions: { orderBy: questions.order } } },
      section: { with: { course: true } },
    },
  });

  if (!attempt) notFound();

  const professorSectionsList = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
  });
  const enrolledSectionIds = professorSectionsList.map((ps) => ps.sectionId);

  if (!enrolledSectionIds.includes(attempt.sectionId)) notFound();

  const studentAnswers =
    attempt.answers && typeof attempt.answers === "string"
      ? JSON.parse(attempt.answers)
      : (attempt.answers as Record<string, unknown>) || {};
  const gptFeedback: Record<string, any> = attempt.gptFeedback || {};
  const questionKeyMap = buildLegacyQuestionKeyMap(
    attempt.quiz.questions.map((question) => ({
      id: question.id,
      order: question.order,
      question: question.question,
      correctAnswer: question.correctAnswer,
    })),
    studentAnswers,
    gptFeedback,
  );

  const percentage =
    attempt.percentage ??
    (attempt.maxScore
      ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
      : 0);

  const fallbackQuestionCount = attempt.quiz.questions.reduce((count, question) => {
    if (question.type !== "SHORT_ANSWER") {
      return count;
    }

    const questionFeedback = resolveAttemptFeedback(
      question.id,
      gptFeedback,
      questionKeyMap,
    );

    return isFallbackGradingFeedback(questionFeedback) ? count + 1 : count;
  }, 0);

  return (
    <AppShell
      role="professor"
      active="quizzes"
      topbarEyebrow="Faculty"
      topbarTitle="Submission detail"
      maxWidth="wide"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "All results",
            href: withBasePath("/dashboard/professor/quiz-results"),
          },
          {
            label: attempt.quiz.title,
            href: withBasePath(
              `/dashboard/professor/quiz/${attempt.quiz.id}/results`,
            ),
          },
          { label: "Submission" },
        ]}
        eyebrow="Submission"
        title={`${attempt.student.firstName} ${attempt.student.lastName}`}
        description={`${attempt.quiz.title} · ${attempt.section.name} · ${attempt.section.course.title}`}
        actions={
          attempt.submittedAt ? (
            <RegradeAttemptButton
              attemptId={attempt.id}
              fallbackQuestionCount={fallbackQuestionCount}
            />
          ) : null
        }
      />

      <section className="mt-12">
        <SectionHeading eyebrow="Identity" title="Submission metadata" />
        <dl className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 paper paper-shadow p-6">
          <div>
            <dt className="eyebrow text-ink-faint">Learner</dt>
            <dd className="mt-2 text-ink">
              {attempt.student.firstName} {attempt.student.lastName}
            </dd>
            <dd className="text-xs text-ink-faint">
              {attempt.student.email}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Section</dt>
            <dd className="mt-2 text-ink">{attempt.section.name}</dd>
            <dd className="text-xs text-ink-faint">
              {attempt.section.course.title}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Score</dt>
            <dd className="mt-2 stat-numeral text-2xl text-ink">
              {percentage}%
            </dd>
            <dd className="text-xs text-ink-faint tnum">
              {attempt.score}/{attempt.maxScore}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-ink-faint">Submitted</dt>
            <dd className="mt-2 text-ink tnum">
              {attempt.submittedAt
                ? new Date(attempt.submittedAt).toLocaleString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Responses"
          title="Question-by-question review"
        />
        <div className="mt-6 flex flex-col gap-4">
          {attempt.quiz.questions.map((question, index) => {
            const answerValue = resolveAttemptAnswer(
              question.id,
              studentAnswers as Record<string, unknown>,
              questionKeyMap,
            );
            let isCorrect = false;
            const questionFeedback = resolveAttemptFeedback(
              question.id,
              gptFeedback,
              questionKeyMap,
            );
            if (question.type === "SHORT_ANSWER") {
              isCorrect = questionFeedback?.score === question.points;
            } else {
              isCorrect = answerValue === question.correctAnswer;
            }

            const noAnswer =
              answerValue === undefined ||
              answerValue === null ||
              answerValue === "";

            return (
              <article
                key={question.id}
                className="paper paper-shadow p-6 flex flex-col gap-4"
              >
                <header className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="eyebrow text-ink-faint">
                      Question {index + 1}
                    </span>
                    <h3 className="font-display text-lg text-ink leading-snug">
                      {question.question}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-ink-faint tnum">
                      {question.points} pts
                    </span>
                    {!noAnswer ? (
                      isCorrect ? (
                        <Badge variant="success">Correct</Badge>
                      ) : (
                        <Badge variant="destructive">Incorrect</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Skipped</Badge>
                    )}
                  </div>
                </header>

                <div className="hairline" />

                <div className="flex flex-col gap-3">
                  <span className="eyebrow text-ink-faint">Response</span>
                  <div className="text-ink">
                    {noAnswer ? (
                      <em className="text-ink-faint">No answer provided.</em>
                    ) : (
                      <span>{String(answerValue)}</span>
                    )}
                  </div>

                  {question.type === "MULTIPLE_CHOICE" &&
                  Array.isArray(question.options) ? (
                    <ul className="flex flex-col gap-1.5 mt-2">
                      {(question.options as string[]).map((opt) => {
                        const isStudent = opt === answerValue;
                        const isAnswer = opt === question.correctAnswer;
                        return (
                          <li
                            key={opt}
                            className={`text-sm flex items-center gap-2 ${
                              isAnswer
                                ? "text-success"
                                : isStudent
                                  ? "text-danger"
                                  : "text-ink-muted"
                            }`}
                          >
                            <span className="font-mono text-xs">
                              {isAnswer ? "✓" : isStudent ? "✗" : "·"}
                            </span>
                            {opt}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {question.type !== "SHORT_ANSWER" && question.correctAnswer ? (
                    <p className="text-xs text-ink-faint mt-1">
                      Expected:{" "}
                      <span className="text-ink-muted">
                        {String(question.correctAnswer)}
                      </span>
                    </p>
                  ) : null}
                </div>

                {question.type === "SHORT_ANSWER" && questionFeedback ? (
                  <GPTFeedbackDisplay
                    feedback={questionFeedback}
                    questionText={question.question}
                    studentAnswer={String(answerValue ?? "")}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
