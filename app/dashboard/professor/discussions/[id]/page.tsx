import Link from 'next/link';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  chatbotSections,
  chatbotSessions,
  chatbots,
  professorSections,
} from '@/app/db/schema';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { appPath, withBasePath } from '@/lib/basePath';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { appRedirect } from '@/lib/serverRedirect';
import { formatDateTimeStable } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscussionSessionsPage(props: PageProps) {
  const user = await getOrCreateUser();
  if (!user || user.role !== 'PROFESSOR') return null;

  const { id } = await props.params;
  const bot = await db.query.chatbots.findFirst({
    where: and(
      eq(chatbots.id, id),
      isNull(chatbots.deletedAt),
      eq(chatbots.professorId, user.id),
    ),
    with: { relatedQuiz: true },
  });
  if (!bot) appRedirect('/dashboard/professor/discussions');

  const taught = await db.query.professorSections.findMany({
    where: eq(professorSections.professorId, user.id),
  });
  const taughtIds = taught.map((t) => t.sectionId);

  const assigned = await db.query.chatbotSections.findMany({
    where: eq(chatbotSections.chatbotId, id),
  });
  const allowed = assigned
    .map((a) => a.sectionId)
    .filter((sid) => taughtIds.includes(sid));

  const sessions =
    allowed.length > 0
      ? await db.query.chatbotSessions.findMany({
          where: and(
            eq(chatbotSessions.chatbotId, id),
            eq(chatbotSessions.status, 'completed'),
            inArray(chatbotSessions.sectionId, allowed),
          ),
          with: { student: true, section: true },
          orderBy: [desc(chatbotSessions.completedAt)],
        })
      : [];

  return (
    <AppShell
      role="professor"
      active="discussions"
      topbarEyebrow="Faculty"
      topbarTitle="Discussion sessions"
    >
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: withBasePath('/dashboard/professor') },
          {
            label: 'Discussions',
            href: withBasePath('/dashboard/professor/discussions'),
          },
          { label: bot.title },
        ]}
        eyebrow="Sessions"
        title={bot.title}
        description="Completed student transcripts for this discussion."
        actions={
          <Button asChild variant="outline">
            <Link
              href={appPath(`/dashboard/professor/discussions/${bot.id}/edit`)}
            >
              Edit
            </Link>
          </Button>
        }
      />

      {bot.relatedQuiz ? (
        <Badge variant="outline" className="mt-4">
          Learning mode · {bot.relatedQuiz.title}
        </Badge>
      ) : null}

      <div className="mt-8 paper paper-shadow overflow-hidden">
        {sessions.length === 0 ? (
          <p className="p-6 text-ink-muted">No completed sessions yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {[s.student.firstName, s.student.lastName]
                      .filter(Boolean)
                      .join(' ') || s.student.email}
                  </TableCell>
                  <TableCell>{s.section.name}</TableCell>
                  <TableCell>
                    {s.completedAt
                      ? formatDateTimeStable(s.completedAt)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(s.messages) ? s.messages.length : 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={appPath(
                          `/dashboard/professor/discussions/session/${s.id}`,
                        )}
                      >
                        Review
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </AppShell>
  );
}
