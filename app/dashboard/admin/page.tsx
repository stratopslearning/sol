import { FileText, Layers, Users as UsersIcon } from 'lucide-react';

import { db } from '@/app/db';
import { courses, sections } from '@/app/db/schema';
import { CourseFormModal } from '@/components/admin/CourseFormModal';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { activeOnly } from '@/lib/db/filters';
import { withBasePath } from '@/lib/basePath';
import { requireAdmin } from '@/lib/auth';

function getCourseCardLayoutClass(courseCount: number, index: number) {
  const isLast = index === courseCount - 1;
  const hasSingleMdRemainder = courseCount > 1 && courseCount % 2 === 1;
  const hasSingleLgRemainder = courseCount > 3 && courseCount % 3 === 1;

  if (!isLast) return '';

  return [
    hasSingleMdRemainder ? 'md:col-span-2' : '',
    hasSingleLgRemainder ? 'lg:col-span-1 lg:col-start-2' : 'lg:col-span-1',
  ]
    .filter(Boolean)
    .join(' ');
}

export default async function AdminDashboardPage() {
  // Defense in depth: middleware also enforces admin-only on /dashboard/admin,
  // but RSCs that read from the DB should re-check so a misconfigured matcher
  // can never leak data.
  await requireAdmin();

  const [allCourses, allSections, allUsers] = await Promise.all([
    db.query.courses.findMany({ where: activeOnly(courses.deletedAt) }),
    db.query.sections.findMany({ where: activeOnly(sections.deletedAt) }),
    db.query.users.findMany(),
  ]);

  const studentCount = allUsers.filter((u) => u.role === 'STUDENT').length;
  const professorCount = allUsers.filter((u) => u.role === 'PROFESSOR').length;

  return (
    <AppShell role="admin" topbarEyebrow="Administration" topbarTitle="Overview">
      <PageHeader
        eyebrow="Administration"
        title="Institution overview."
        description="A snapshot of the catalog, the cohort, and the people who keep both running."
      />

      <section className="mt-12 flex flex-col gap-6">
        <SectionHeading
          eyebrow="At a glance"
          title="Catalog & cohort"
          description="Counts across every term, every section, every role."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Courses"
            value={allCourses.length}
            hint="All published and draft courses"
            icon={<FileText className="h-4 w-4" />}
          />
          <StatCard
            label="Sections"
            value={allSections.length}
            hint="Active sections across all terms"
            icon={<Layers className="h-4 w-4" />}
          />
          <StatCard
            label="Students"
            value={studentCount}
            hint={`${professorCount} faculty also enrolled`}
            icon={<UsersIcon className="h-4 w-4" />}
          />
          <StatCard
            label="Total people"
            value={allUsers.length}
            hint="Students, faculty, administrators"
            icon={<UsersIcon className="h-4 w-4" />}
            accent
          />
        </div>
      </section>

      <section className="mt-16 flex flex-col gap-6">
        <SectionHeading
          eyebrow="Quick actions"
          title="What needs doing"
          actions={<CourseFormModal mode="create" />}
        />
        <p className="text-sm text-ink-muted max-w-[60ch]">
          Create a new course, then assign sections from the{' '}
          <a
            href={withBasePath('/dashboard/admin/sections')}
            className="text-brand underline underline-offset-4 decoration-brand-soft hover:decoration-brand"
          >
            sections page
          </a>
          . Bulk import students from <em>People</em> when registrations open.
        </p>
      </section>

      <section className="mt-16 flex flex-col gap-6">
        <SectionHeading eyebrow="Catalog" title="All courses" />

        {allCourses.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            eyebrow="No courses yet"
            title="The catalog is empty."
            description="Create your first course to begin building sections and quizzes for the term."
            actions={<CourseFormModal mode="create" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCourses.map((course, index) => {
              const safeCourse = {
                ...course,
                description: course.description ?? undefined,
              };
              return (
                <article
                  key={course.id}
                  className={`paper paper-shadow p-6 flex flex-col gap-3 hover:bg-surface-sunken/40 transition-colors ${getCourseCardLayoutClass(
                    allCourses.length,
                    index,
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono tnum text-xs text-ink-faint">
                      {String(course.id).padStart(3, '0')}
                    </span>
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <h3
                    className="font-display text-ink"
                    style={{
                      fontSize: '1.25rem',
                      lineHeight: 1.25,
                      fontVariationSettings: '"opsz" 36',
                    }}
                  >
                    {course.title}
                  </h3>
                  {course.description ? (
                    <p className="text-sm text-ink-muted leading-relaxed line-clamp-3">
                      {course.description}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-3">
                    <CourseFormModal mode="delete" course={safeCourse} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
