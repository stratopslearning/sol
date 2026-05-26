import { AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { EmptyState } from "@/components/patterns/EmptyState";
import { StatCard } from "@/components/patterns/StatCard";
import { QuickRegradeButton } from "@/components/quiz/QuickRegradeButton";
import { RegradeAllButton } from "@/components/quiz/RegradeAllButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withBasePath } from "@/lib/basePath";
import { getOrCreateUser } from "@/lib/getOrCreateUser";
import { getAttentionItemsForProfessor } from "@/lib/professorAttention";

export const dynamic = "force-dynamic";

function formatTimestamp(value: Date | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AttentionPage() {
  const user = await getOrCreateUser();
  if (!user || user.role !== "PROFESSOR") return null;

  const items = await getAttentionItemsForProfessor(user.id, { limit: 200 });

  const totalAttempts = items.length;
  const totalPending = items.reduce((s, i) => s + i.pendingCount, 0);
  const totalManualReview = items.reduce(
    (s, i) => s + i.manualReviewCount,
    0,
  );
  const totalLegacy = items.reduce((s, i) => s + i.legacyFallbackCount, 0);

  return (
    <AppShell
      role="professor"
      active="attention"
      topbarEyebrow="Faculty"
      topbarTitle="Attention queue"
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          { label: "Attention" },
        ]}
        eyebrow="Grading"
        title="Responses that need your attention"
        description="Submissions where at least one short-answer question is still pending, awaiting manual review, or used the legacy fallback grader. Re-grade in place, or open the attempt to review and override scores."
        actions={<RegradeAllButton count={totalAttempts} />}
      />

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading
          eyebrow="At a glance"
          title="What's waiting"
          description="Counts across all the sections you teach."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Attempts"
            value={totalAttempts}
            icon={<Eye className="h-4 w-4" />}
            hint="Need your review"
          />
          <StatCard
            label="Pending questions"
            value={totalPending}
            icon={<Clock className="h-4 w-4" />}
            hint="Auto-retry in progress"
          />
          <StatCard
            label="Manual review"
            value={totalManualReview}
            icon={<AlertTriangle className="h-4 w-4" />}
            hint="Auto-grader gave up"
            accent={totalManualReview > 0}
          />
          <StatCard
            label="Legacy fallback"
            value={totalLegacy}
            icon={<CheckCircle className="h-4 w-4" />}
            hint="Older fallback grade"
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Queue"
          title="By most recent submission"
          description="One row per attempt. The badge shows why it needs attention."
          actions={
            totalAttempts > 0 ? (
              <RegradeAllButton count={totalAttempts} />
            ) : null
          }
        />

        {items.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<CheckCircle className="h-5 w-5" />}
              eyebrow="All clear"
              title="Nothing in the queue."
              description="Every short-answer response in your sections has been graded. The auto-grader will surface anything here automatically when it needs your attention."
            />
          </div>
        ) : (
          <div className="mt-6 paper paper-shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="tnum">Needs</TableHead>
                  <TableHead className="tnum">Score so far</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const fullName = `${item.student.firstName ?? ""} ${
                    item.student.lastName ?? ""
                  }`.trim() || item.student.email || "Unknown";
                  const courseTitle = item.section.course?.title ?? "";

                  const badges: React.ReactNode[] = [];
                  if (item.manualReviewCount > 0) {
                    badges.push(
                      <Badge key="manual" variant="destructive">
                        Manual review · {item.manualReviewCount}
                      </Badge>,
                    );
                  }
                  if (item.pendingCount > 0) {
                    badges.push(
                      <Badge key="pending" variant="warning">
                        Pending · {item.pendingCount}
                      </Badge>,
                    );
                  }
                  if (item.legacyFallbackCount > 0) {
                    badges.push(
                      <Badge key="legacy" variant="secondary">
                        Legacy · {item.legacyFallbackCount}
                      </Badge>,
                    );
                  }
                  if (badges.length === 0) {
                    badges.push(
                      <Badge key="unknown" variant="outline">
                        Needs review
                      </Badge>,
                    );
                  }

                  return (
                    <TableRow key={item.attemptId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-ink truncate max-w-[18ch]">
                            {fullName}
                          </span>
                          <span className="text-xs text-ink-faint truncate max-w-[22ch]">
                            {item.student.email ?? ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-ink truncate block max-w-[22ch]">
                          {item.quiz.title}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-ink truncate max-w-[18ch]">
                            {item.section.name}
                          </span>
                          {courseTitle ? (
                            <span className="text-xs text-ink-faint truncate max-w-[22ch]">
                              {courseTitle}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted tnum">
                        {formatTimestamp(item.submittedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">{badges}</div>
                      </TableCell>
                      <TableCell className="tnum">
                        <span className="font-medium text-ink">
                          {item.needsAttentionCount}
                        </span>
                        <span className="text-xs text-ink-faint">
                          {" "}
                          / {item.totalShortAnswer}
                        </span>
                      </TableCell>
                      <TableCell className="tnum">
                        <span className="text-sm text-ink">
                          {item.percentage != null ? `${item.percentage}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={withBasePath(
                                `/dashboard/professor/attempt/${item.attemptId}`,
                              )}
                              aria-label="Open attempt"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <QuickRegradeButton attemptId={item.attemptId} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
