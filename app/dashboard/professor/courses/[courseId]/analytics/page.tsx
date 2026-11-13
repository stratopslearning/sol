import Link from 'next/link';
import { requireTeachingAccess } from '@/lib/authz/gates';
import { notFound } from 'next/navigation';
import { BarChart2 } from '@/components/icons';
import { and, inArray, isNull } from 'drizzle-orm';

import { CourseHubShell } from '@/components/professor/CourseHubShell';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/app/db';
import { sections } from '@/app/db/schema';
import { getCourseAnalytics } from '@/lib/analytics';
import { listTeachableSectionIdsForCourse } from '@/lib/authoring/access';
import { appPath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { assertCanManageCourse } from '@/lib/knowledge/access';
import { appRedirect } from '@/lib/serverRedirect';

export const dynamic = 'force-dynamic';

export default async function CourseHubAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ sectionId?: string }>;
}) {
  const user = await requireTeachingAccess();

  const { courseId } = await params;
  const { sectionId } = await searchParams;

  let course: { id: string; title: string };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }

  const teachableIds = await listTeachableSectionIdsForCourse(user, courseId);
  const sectionRows =
    teachableIds.length > 0
      ? await db.query.sections.findMany({
          where: and(
            inArray(sections.id, teachableIds),
            isNull(sections.deletedAt),
          ),
          columns: { id: true, name: true },
          orderBy: (s, { asc }) => [asc(s.name)],
        })
      : [];

  const analytics = await getCourseAnalytics(user, courseId, {
    sectionId: sectionId || null,
  });

  const analyticsBase = `/dashboard/professor/courses/${courseId}/analytics`;

  return (
    <CourseHubShell
      courseId={courseId}
      courseTitle={course.title}
      description="Concept success rates from tagged quiz questions, plus lesson completion against your roster."
      activeTab="analytics"
    >
      {sectionRows.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link
            href={appPath(analyticsBase)}
            className={
              !sectionId
                ? 'font-medium text-ink underline'
                : 'text-ink-muted hover:text-ink'
            }
          >
            All sections
          </Link>
          {sectionRows.map((s) => (
            <Link
              key={s.id}
              href={appPath(`${analyticsBase}?sectionId=${s.id}`)}
              className={
                sectionId === s.id
                  ? 'font-medium text-ink underline'
                  : 'text-ink-muted hover:text-ink'
              }
            >
              {s.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tag coverage"
          value={`${analytics.tagCoverage.percent}%`}
          hint={`${analytics.tagCoverage.taggedQuestions}/${analytics.tagCoverage.totalQuestions} questions tagged`}
        />
        <StatCard
          label="Concept gaps"
          value={String(analytics.gapCount)}
          hint="Success rate under 60%"
        />
        <StatCard
          label="Avg lesson completion"
          value={`${analytics.avgLessonCompletionRate}%`}
          hint={`${analytics.lessons.length} released lesson${analytics.lessons.length === 1 ? '' : 's'}`}
        />
      </div>

      <section className="mt-12">
        <SectionHeading
          eyebrow="Concepts"
          title="Mastery by tag"
          description="Aggregated from submitted attempts on tagged questions."
        />
        {analytics.concepts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BarChart2 className="h-5 w-5" />}
              eyebrow="No tagged data"
              title="No concept tags yet."
              description="Generate quizzes from Authoring so questions carry concept tags, then wait for student submissions."
            />
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concept</TableHead>
                  <TableHead className="tnum">Questions</TableHead>
                  <TableHead className="tnum">Attempts</TableHead>
                  <TableHead className="tnum">Success</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.concepts.map((c) => (
                  <TableRow key={c.tag}>
                    <TableCell className="font-medium">{c.tag}</TableCell>
                    <TableCell className="tnum">{c.questionCount}</TableCell>
                    <TableCell className="tnum">{c.attemptCount}</TableCell>
                    <TableCell className="tnum">{c.successRate}%</TableCell>
                    <TableCell>
                      {c.gap ? (
                        <Badge variant="destructive">Gap</Badge>
                      ) : c.attemptCount === 0 ? (
                        <Badge variant="outline">No attempts</Badge>
                      ) : (
                        <Badge variant="outline">On track</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionHeading
          eyebrow="Lessons"
          title="Completion"
          description="Active students in assigned sections vs lesson progress."
        />
        {analytics.lessons.length === 0 ? (
          <p className="mt-6 text-sm text-ink-muted">
            No released lessons for this course yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson</TableHead>
                  <TableHead className="tnum">Roster</TableHead>
                  <TableHead className="tnum">Not started</TableHead>
                  <TableHead className="tnum">Started</TableHead>
                  <TableHead className="tnum">Completed</TableHead>
                  <TableHead className="tnum">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.lessons.map((l) => (
                  <TableRow key={l.lessonId}>
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell className="tnum">{l.rosterCount}</TableCell>
                    <TableCell className="tnum">{l.neverStarted}</TableCell>
                    <TableCell className="tnum">{l.started}</TableCell>
                    <TableCell className="tnum">{l.completed}</TableCell>
                    <TableCell className="tnum">{l.completionRate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </CourseHubShell>
  );
}
