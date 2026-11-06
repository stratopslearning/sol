import { notFound } from 'next/navigation';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { Lightbulb } from '@/components/icons';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { analyticsRollups, courseOfferings } from '@/app/db/schema';
import { CourseHubShell } from '@/components/professor/CourseHubShell';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { Button } from '@/components/ui/button';
import {
  computeRollupsForCourse,
  type WhatToChangeSuggestion,
} from '@/lib/analytics/computeRollups';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { getCourseWorkspaceId } from '@/lib/workspace';
import { appRedirect } from '@/lib/serverRedirect';

export const dynamic = 'force-dynamic';

function suggestionsFromPayload(payload: unknown): WhatToChangeSuggestion[] {
  if (!payload || typeof payload !== 'object') return [];
  const s = (payload as { suggestions?: unknown }).suggestions;
  return Array.isArray(s) ? (s as WhatToChangeSuggestion[]) : [];
}

export default async function CourseInsightsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  let course: { id: string; title: string };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  const tenantId = await getCourseWorkspaceId(courseId);
  const offering = await db.query.courseOfferings.findFirst({
    where: and(
      eq(courseOfferings.courseId, courseId),
      eq(courseOfferings.termLabel, 'default'),
    ),
  });

  let rollup =
    tenantId && offering
      ? await db.query.analyticsRollups.findFirst({
          where: and(
            eq(analyticsRollups.tenantId, tenantId),
            eq(analyticsRollups.kind, 'criterion_miss_rates'),
            eq(analyticsRollups.offeringId, offering.id),
          ),
          orderBy: [desc(analyticsRollups.computedAt)],
        })
      : null;

  if (!rollup && tenantId) {
    await computeRollupsForCourse({
      tenantId,
      courseId,
      offeringId: offering?.id ?? null,
    });
    rollup = await db.query.analyticsRollups.findFirst({
      where: and(
        eq(analyticsRollups.tenantId, tenantId),
        eq(analyticsRollups.kind, 'criterion_miss_rates'),
      ),
      orderBy: [desc(analyticsRollups.computedAt)],
    });
  }

  const suggestions = suggestionsFromPayload(rollup?.payload);

  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      activeTab="insights"
    >
      <SectionHeading
        title="What to change"
        description="Suggestions from criterion miss rates on submitted attempts. Accepting creates an authoring revision when an outline exists."
      />

      {suggestions.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-8 w-8" aria-hidden />}
          title="No suggestions yet"
          description="Rollups run nightly or via cron once enough graded short-answer attempts exist."
        />
      ) : (
        <ul className="mt-6 space-y-4">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-card p-4 text-sm"
            >
              <p className="font-medium">{s.title}</p>
              <p className="mt-1 text-muted-foreground">
                Miss rate {(s.missRate * 100).toFixed(0)}% over {s.evaluated}{' '}
                evaluations · {s.description}
              </p>
              <form
                className="mt-3"
                action={withBasePath(
                  `/api/professor/courses/${courseId}/insights/accept`,
                )}
                method="post"
              >
                <input type="hidden" name="suggestionId" value={s.id} />
                <input type="hidden" name="title" value={s.title} />
                <Button type="submit" size="sm" variant="secondary">
                  Accept into authoring
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </CourseHubShell>
  );
}
