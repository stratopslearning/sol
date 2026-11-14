import { requireTeachingAccess } from '@/lib/authz/gates';

import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { TranscriptDownloadButton } from '@/components/chatbot/TranscriptDownloadButton';
import { withBasePath } from '@/lib/basePath';
import { getDiscussionSession } from '@/lib/professor/discussions';
import { appRedirect } from '@/lib/serverRedirect';
import { LocalDateTime } from '@/components/timezone/LocalDateTime';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

type TranscriptMessage = { role?: string; content?: string; at?: string };

export default async function ProfessorSessionReviewPage(props: PageProps) {
  const user = await requireTeachingAccess();

  const { sessionId } = await props.params;
  let session;
  try {
    session = await getDiscussionSession(user, sessionId);
  } catch {
    appRedirect('/dashboard/professor/discussions');
  }

  const studentName = session.studentName;
  const rawMessages = (
    Array.isArray(session.messages) ? session.messages : []
  ) as TranscriptMessage[];
  const messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    at?: string;
  }> = rawMessages.flatMap((m) => {
    if (m.role !== 'user' && m.role !== 'assistant') return [];
    const content = typeof m.content === 'string' ? m.content : '';
    return [{ role: m.role, content, at: m.at }];
  });

  return (
    <AppShell
      role="professor"
      active="assignments"
      topbarTitle="Transcript"
      maxWidth="narrow"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'Assignments',
            href: withBasePath('/dashboard/professor/assignments'),
          },
          {
            label: session.chatbotTitle,
            href: withBasePath('/dashboard/professor/discussions'),
          },
          { label: 'Transcript' },
        ]}
        eyebrow="Transcript"
        title={studentName}
        description={
          <>
            {session.chatbotTitle} · {session.sectionName}
            {session.completedAt ? (
              <>
                {' · '}
                <LocalDateTime value={session.completedAt} />
              </>
            ) : null}
          </>
        }
        actions={
          <TranscriptDownloadButton
            title={session.chatbotTitle}
            personaName={session.personaName}
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
              key={`${m.at ?? i}-${i}`}
              className={
                m.role === 'user' ? 'text-[#0b5394]' : 'text-[#38761d]'
              }
            >
              <strong>
                {m.role === 'user' ? studentName : session.personaName}:
              </strong>{' '}
              <span className="whitespace-pre-wrap">{m.content}</span>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
