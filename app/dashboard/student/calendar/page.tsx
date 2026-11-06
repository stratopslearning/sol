import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { StudentCalendarClient } from '@/components/student/StudentCalendarClient';
import { requireStudent } from '@/lib/auth';
import { withBasePath } from '@/lib/basePath';
import { listStudentQuizDueEvents } from '@/lib/student/quizCalendar';

export default async function StudentCalendarPage() {
  const user = await requireStudent();
  const events = await listStudentQuizDueEvents(user.id);

  return (
    <AppShell
      role="student"
      active="calendar"
      user={user}
      topbarTitle="Calendar"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/student') },
          { label: 'Calendar' },
        ]}
        eyebrow="Schedule"
        title="Calendar."
        description="Quiz due dates across every section you’re enrolled in. Switch between month and list."
      />
      <div className="mt-8">
        <StudentCalendarClient events={events} />
      </div>
    </AppShell>
  );
}
