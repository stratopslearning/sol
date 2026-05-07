import { eq } from "drizzle-orm";

import { db } from "@/app/db";
import { attempts } from "@/app/db/schema";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/basePath";
import { appRedirect } from "@/lib/serverRedirect";
import { getOrCreateUser } from "@/lib/getOrCreateUser";

interface ResultsPageProps {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}

export default async function ResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const p = await params;
  const sp = await searchParams;
  const attemptId = sp.attemptId;
  const user = await getOrCreateUser();
  if (!user) appRedirect("/login");

  if (!attemptId) {
    appRedirect("/dashboard/student");
  }

  const attempt = await db.query.attempts.findFirst({
    where: eq(attempts.id, attemptId),
    with: { quiz: true },
  });

  if (!attempt || attempt.studentId !== user.id) {
    appRedirect("/dashboard/student");
  }

  const quiz = attempt.quiz;
  const percentage =
    attempt.percentage ??
    (attempt.maxScore
      ? Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)
      : 0);

  return (
    <AppShell
      role="student"
      active="quizzes"
      topbarEyebrow="Submission"
      topbarTitle={quiz.title}
      maxWidth="narrow"
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        paid: user.paid,
      }}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/student") },
          {
            label: "My quizzes",
            href: withBasePath("/dashboard/student/quizzes"),
          },
          { label: "Submitted" },
        ]}
        eyebrow="Submitted"
        title="Quiz received."
        description={`Your response to ${quiz.title} has been recorded. A summary is below.`}
      />

      <section className="mt-12">
        <div className="paper paper-shadow p-8 md:p-10">
          <div className="flex flex-col items-center text-center gap-6">
            <span className="eyebrow text-ink-faint">Result</span>
            <div className="stat-numeral text-7xl text-ink leading-none">
              {percentage}
              <span className="text-4xl text-ink-muted">%</span>
            </div>
            <p className="text-ink-muted tnum">
              {attempt.score} of {attempt.maxScore} points
            </p>

            <div className="hairline w-full max-w-xs my-2" />

            <dl className="flex flex-col sm:flex-row gap-6 text-sm text-ink-muted">
              <div className="flex flex-col items-center gap-1">
                <dt className="eyebrow text-ink-faint">Submitted</dt>
                <dd className="tnum text-ink">
                  {new Date(attempt.submittedAt!).toLocaleString()}
                </dd>
              </div>
              <div className="flex flex-col items-center gap-1">
                <dt className="eyebrow text-ink-faint">Status</dt>
                <dd className="text-ink">
                  {attempt.passed ? "Passed" : "Submitted"}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a
              href={withBasePath(
                `/quiz/${p.quizId}/review?attemptId=${attemptId}`,
              )}
            >
              Review answers
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={withBasePath("/dashboard/student")}>
              Back to dashboard
            </a>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
