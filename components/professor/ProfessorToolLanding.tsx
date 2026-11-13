import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { CoursePickerLanding } from '@/components/professor/CoursePickerLanding';
import { withBasePath } from '@/lib/basePath';
import { fillCourseHrefTemplate } from '@/lib/professor/courseHref';
import type { AuthzUser } from '@/lib/authz/courseAccess';
import { listTeachableCourses } from '@/lib/knowledge';
import { resolveProfessorCourseIdFromList } from '@/lib/professor/activeCourse';
import { appRedirect } from '@/lib/serverRedirect';

export async function ProfessorToolLanding({
  user,
  active,
  toolLabel,
  title,
  description,
  hrefTemplate,
  courseIdParam,
}: {
  user: AuthzUser;
  active: string;
  toolLabel: string;
  title: string;
  description: string;
  /** Path with `{courseId}` placeholder. */
  hrefTemplate: string;
  courseIdParam?: string | null;
}) {
  const courses = await listTeachableCourses(user);
  const resolved = await resolveProfessorCourseIdFromList(
    courses,
    courseIdParam,
  );
  if (resolved.ok) {
    appRedirect(fillCourseHrefTemplate(hrefTemplate, resolved.courseId));
  }

  return (
    <AppShell role="professor" active={active} topbarTitle={title}>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          { label: toolLabel },
        ]}
        eyebrow={toolLabel}
        title={title}
        description={description}
      />
      <div className="mt-8">
        {resolved.code === 'forbidden' ? (
          <p className="mb-4 text-sm text-destructive">
            {resolved.message} Choose a course you can manage.
          </p>
        ) : null}
        <CoursePickerLanding
          courses={courses}
          toolLabel={toolLabel.toLowerCase()}
          hrefTemplate={hrefTemplate}
        />
      </div>
    </AppShell>
  );
}
