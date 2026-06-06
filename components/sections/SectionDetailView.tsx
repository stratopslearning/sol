import Link from 'next/link';
import type { ReactNode } from 'react';
import { Calendar, FileText, Users } from 'lucide-react';

import CopyEnrollmentButton from '@/components/CopyEnrollmentButton';
import { SectionRosterTable } from '@/components/sections/SectionRosterTable';
import { SectionHeading } from '@/components/layout/SectionHeading';
import { EmptyState } from '@/components/patterns/EmptyState';
import { StatCard } from '@/components/patterns/StatCard';
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
import { cleanQuizDescription, formatDateStable } from '@/lib/utils';
import type { SectionDetailData } from '@/lib/sectionDetailData';

type SectionDetailViewProps = {
  data: SectionDetailData;
  role: 'admin' | 'professor';
  sectionId: string;
  enrollmentActions?: ReactNode;
  quizRowActions?: (quizId: string) => ReactNode;
  headerActions?: ReactNode;
};

export function SectionDetailView({
  data,
  role,
  sectionId,
  enrollmentActions,
  quizRowActions,
  headerActions,
}: SectionDetailViewProps) {
  const { section, learnerEnrollments, facultyEnrollments, quizzes } = data;
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
          label="Quizzes"
          value={quizzes.length}
          icon={<FileText className="h-4 w-4" />}
          hint="Assigned to this section"
        />
        <StatCard
          label="Created"
          value={formatDateStable(section.createdAt) ?? '—'}
          icon={<Calendar className="h-4 w-4" />}
          hint={`Updated ${formatDateStable(section.updatedAt) ?? '—'}`}
        />
      </section>

      {headerActions ? (
        <div className="mt-6 flex flex-wrap gap-2">{headerActions}</div>
      ) : null}

      <section className="mt-12">
        <SectionHeading eyebrow="Codes" title="Enrolment access" />
        <div className="mt-6 paper paper-shadow p-6 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {section.course ? (
              <Badge variant="outline">{section.course.title}</Badge>
            ) : null}
            <Badge variant="info">{data.activeLearnerCount} active learners</Badge>
            <Badge variant="default">{data.activeFacultyCount} active faculty</Badge>
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
          />
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Coursework"
          title="Assigned quizzes"
          description={`${quizzes.length} ${
            quizzes.length === 1 ? 'quiz' : 'quizzes'
          }`}
        />
        <div className="mt-6">
          {quizzes.length === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title="No quizzes assigned."
              description="Assign a quiz to this section from the quizzes page."
            />
          ) : (
            <div className="paper paper-shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="tnum">Submissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizzes.map((quiz) => (
                    <TableRow key={quiz.id}>
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
                      <TableCell className="text-sm text-ink-muted">
                        {quiz.endDate
                          ? formatDateStable(quiz.endDate) ?? '—'
                          : '—'}
                      </TableCell>
                      <TableCell className="tnum">{quiz.submissionCount}</TableCell>
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
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
