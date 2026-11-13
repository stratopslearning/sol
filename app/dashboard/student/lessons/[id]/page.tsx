import { notFound } from 'next/navigation';

import LessonReaderClient from './LessonReaderClient';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { withBasePath } from '@/lib/basePath';
import { requireStudent } from '@/lib/auth';
import { getStudentLessonDetail } from '@/lib/learning';
import { ApiError } from '@/lib/api/errors';

export default async function StudentLessonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStudent();
  const { id } = await params;

  let lesson;
  try {
    lesson = await getStudentLessonDetail(user.id, id);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  return (
    <AppShell
      role="student"
      active="assignments"
      topbarTitle={lesson.title}
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/student') },
          {
            label: 'Assignments',
            href: withBasePath('/dashboard/student/assignments'),
          },
          { label: lesson.title },
        ]}
        eyebrow={lesson.courseTitle || 'Lesson'}
        title={lesson.title}
        description="Read the notes, study the cards, then mark the lesson complete."
      />
      <LessonReaderClient lesson={lesson} />
    </AppShell>
  );
}
