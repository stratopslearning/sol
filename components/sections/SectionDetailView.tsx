import Link from 'next/link';
import type { ReactNode } from 'react';
import { Calendar, FileText, Users } from '@/components/icons';

import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import { SectionEndsAtEditor } from '@/components/sections/SectionEndsAtEditor';
import { SectionRosterTable } from '@/components/sections/SectionRosterTable';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
import { LocalDateTime, TIMESTAMP_CELL_CLASS } from '@/components/timezone/LocalDateTime';
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
import { isSectionConcluded } from '@/lib/sectionAvailability';
import { cleanQuizDescription } from '@/lib/utils';
import type { SectionDetailData } from '@/lib/sectionDetailData';

type SectionDetailViewProps = {
  data: SectionDetailData;
  role: 'admin' | 'professor';
  sectionId: string;
  enrollmentActions?: ReactNode;
  quizRowActions?: (quizId: string) => ReactNode;
  discussionRowActions?: (chatbotId: string) => ReactNode;
  headerActions?: ReactNode;
  /** e.g. “Assign existing” for professor section detail */
  courseworkActions?: ReactNode;
};

export function SectionDetailView({
  data,
  role,
  sectionId,
  enrollmentActions,
  quizRowActions,
  discussionRowActions,
  headerActions,
  courseworkActions,
}: SectionDetailViewProps) {
  const { section, learnerEnrollments, facultyEnrollments, quizzes, discussions } =
    data;
  const concluded = isSectionConcluded(section);
  const courseworkCount = quizzes.length + discussions.length;
  const gradebookBase =
    role === 'admin'
      ? `/dashboard/admin/sections/${sectionId}/gradebook`
      : `/dashboard/professor/sections/${sectionId}/gradebook`;
  const quizResultsBase = '/dashboard/professor/quiz';

  return (
    <>
      <section className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active learners"
          value={data.activeLearnerCount}
          icon={<Users className="h-4 w-4" />}
          hint={`${learnerEnrollments.length} total enrolled`}
        />
        <StatCard
          label="Faculty"
          value={data.activeFacultyCount}
          icon={<Users className="h-4 w-4" />}
          hint={`${facultyEnrollments.length} total enrolled`}
        />
        <StatCard
          label="Assignments"
          value={courseworkCount}
          icon={<FileText className="h-4 w-4" />}
          hint={`${quizzes.length} quiz${quizzes.length === 1 ? '' : 'zes'} · ${discussions.length} discussion${discussions.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Section end"
          value={
            section.endsAt
              ? <LocalDateTime value={section.endsAt} dateOnly />
              : 'Open'
          }
          icon={<Calendar className="h-4 w-4" />}
          hint={
            concluded
              ? 'Concluded for students'
              : section.endsAt
                ? <LocalDateTime value={section.endsAt} />
                : 'No end date set'
          }
        />
      </section>

      {headerActions ? (
        <div className="mt-6 flex flex-wrap gap-2">{headerActions}</div>
      ) : null}

      <section className="mt-12">
        <SectionHeading
          eyebrow="Availability"
          title="When this section ends"
          description="Students lose active access after the end date; grades remain under Past / Archived."
        />
        <div className="mt-6">
          <SectionEndsAtEditor
            sectionId={sectionId}
            endsAt={section.endsAt}
            mode={role}
            sectionName={section.name}
          />
        </div>
      </section>

      <section className="mt-12">
        <SectionHeading eyebrow="Codes" title="Enrolment access" />
        <div className="mt-6 paper paper-shadow p-6 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {section.course ? (
              <Badge variant="outline">{section.course.title}</Badge>
            ) : null}
            <Badge variant="info">{data.activeLearnerCount} active learners</Badge>
            <Badge variant="default">{data.activeFacultyCount} active faculty</Badge>
            {concluded ? <Badge variant="outline">Concluded</Badge> : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-ink-faint">Faculty code</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-surface-sunken text-ink px-3 py-2 rounded border border-rule">
                  {section.professorEnrollmentCode}
                </code>
                <CopyEnrollmentButton code={section.professorEnrollmentCode} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow text-ink-faint">Learner code</span>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm bg-surface-sunken text-ink px-3 py-2 rounded border border-rule">
                  {section.studentEnrollmentCode}
                </code>
                <CopyEnrollmentButton code={section.studentEnrollmentCode} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={gradebookBase}>Open gradebook</Link>
            </Button>
            {enrollmentActions}
          </div>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Faculty"
          title="Enrolled faculty"
          description={`${facultyEnrollments.length} ${
            facultyEnrollments.length === 1 ? 'member' : 'members'
          }`}
        />
        <div className="mt-6">
          <SectionRosterTable
            title="Faculty roster"
            enrollments={facultyEnrollments}
            emptyTitle="No faculty enrolled yet."
            emptyDescription="Share the faculty enrolment code with instructors who should join this section."
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Roster"
          title="Enrolled learners"
          description={`${learnerEnrollments.length} ${
            learnerEnrollments.length === 1 ? 'learner' : 'learners'
          } · ${data.activeLearnerCount} active`}
        />
        <div className="mt-6">
          <SectionRosterTable
            title="Learner roster"
            enrollments={learnerEnrollments}
            emptyTitle="No learners enrolled yet."
            emptyDescription="Share the learner enrolment code with students to get them enrolled."
            sectionId={sectionId}
            canRemoveStudents={role === 'professor'}
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Coursework"
          title="Assignments"
          description={`${courseworkCount} ${
            courseworkCount === 1 ? 'item' : 'items'
          } on this section`}
          actions={courseworkActions}
        />
        <div className="mt-6">
          {courseworkCount === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title="No assignments yet."
              description="Use Assign existing, or create one from Assignments / Authoring."
            />
          ) : (
            <div className="paper paper-shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow key={`quiz-${quiz.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          Quiz
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-ink">{quiz.title}</span>
                          {cleanQuizDescription(quiz.description) ? (
                            <span className="text-xs text-ink-faint line-clamp-1">
                              {cleanQuizDescription(quiz.description)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className={`text-sm text-ink-muted ${TIMESTAMP_CELL_CLASS}`}>
                        <div className="flex flex-col gap-0.5">
                          <span>
                            {quiz.endDate ? (
                              <>
                                Due <LocalDateTime value={quiz.endDate} />
                              </>
                            ) : (
                              'No due date'
                            )}
                          </span>
                          <span className="tnum text-xs text-ink-faint">
                            {quiz.submissionCount} submission
                            {quiz.submissionCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link
                              href={`${quizResultsBase}/${quiz.id}/results`}
                            >
                              Results
                            </Link>
                          </Button>
                          {quizRowActions?.(quiz.id)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {discussions.map((d) => (
                    <TableRow key={`discussion-${d.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          Discussion
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-ink">
                        {d.title}
                      </TableCell>
                      <TableCell className="text-sm text-ink-muted">
                        <div className="flex flex-col gap-0.5">
                          <span>{d.personaName}</span>
                          {d.relatedQuizTitle ? (
                            <span className="text-xs text-ink-faint">
                              Linked quiz · {d.relatedQuizTitle}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {role === 'professor' ? (
                            <Button asChild variant="ghost" size="sm">
                              <Link
                                href={`/dashboard/professor/discussions/${d.id}`}
                              >
                                Sessions
                              </Link>
                            </Button>
                          ) : null}
                          {discussionRowActions?.(d.id)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
