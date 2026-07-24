import { and, eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { chatbotSessions, professorSections } from '@/app/db/schema';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { TranscriptDownloadButton } from '@/components/chatbot/TranscriptDownloadButton';
import { withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';
import { formatDateTimeStable } from '@/lib/utils';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function ProfessorSessionReviewPage(props: PageProps) {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const { sessionId } = await props.params;
  const session = await db.query.chatbotSessions.findFirst({
    where: eq(chatbotSessions.id, sessionId),
    with: {
      student: true,
      section: true,
      chatbot: true,
    },
  });
  if (!session) appRedirect('/dashboard/professor/discussions');

  const owns = session.chatbot.professorId === user.id;
  const teaches = await db.query.professorSections.findFirst({
    where: and(
      eq(professorSections.professorId, user.id),
      eq(professorSections.sectionId, session.sectionId),
    ),
  });
  if (!owns && !teaches) {
    appRedirect('/dashboard/professor/discussions');
  }

  const studentName =
    [session.student.firstName, session.student.lastName]
      .filter(Boolean)
      .join(' ') || session.student.email;

  const messages = Array.isArray(session.messages) ? session.messages : [];

  return (
    <AppShell
      role="professor"
      active="discussions"
      topbarEyebrow="Faculty"
      topbarTitle="Transcript"
      maxWidth="narrow"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'Discussions',
            href: withBasePath('/dashboard/professor/discussions'),
          },
          {
            label: session.chatbot.title,
            href: withBasePath(
              `/dashboard/professor/discussions/${session.chatbotId}`,
            ),
          },
          { label: 'Transcript' },
        ]}
        eyebrow="Transcript"
        title={studentName}
        description={`${session.chatbot.title} · ${session.section.name}${
          session.completedAt
            ? ` · ${formatDateTimeStable(session.completedAt)}`
            : ''
        }`}
        actions={
          <TranscriptDownloadButton
            title={session.chatbot.title}
            personaName={session.chatbot.personaName}
            studentName={studentName}
            messages={messages}
          />
        }
      />

      <div className="mt-8 paper paper-shadow p-6 flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-ink-muted">No messages.</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.at}-${i}`}
              className={
                m.role === 'user' ? 'text-[#0b5394]' : 'text-[#38761d]'
              }
            >
              <strong>
                {m.role === 'user' ? studentName : session.chatbot.personaName}:
              </strong>{' '}
              <span className="whitespace-pre-wrap">{m.content}</span>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
