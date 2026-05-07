import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { appRedirect } from "@/lib/serverRedirect";

import { db } from "@/app/db";
import {
  professorSections,
  quizSections,
  sections,
  studentSections,
} from "@/app/db/schema";
import CopyEnrollmentButton from "@/components/CopyEnrollmentButton";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth";
import { withBasePath } from "@/lib/basePath";
import { activeOnly } from "@/lib/db/filters";
import { cleanQuizDescription } from "@/lib/utils";

import LeaveSectionButton from "./LeaveSectionButton";
import UnassignQuizButton from "./UnassignQuizButton";

export default async function SectionDetailsPage({ params }: any) {
  const { sectionId } = await params;

  // Authentication + role check. requireAuth redirects on logged-out callers.
  const me = await requireAuth();
  if (me.role !== "PROFESSOR" && me.role !== "ADMIN") {
    appRedirect("/unauthorized");
  }

  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    with: { course: true },
  });
  if (!section) return notFound();

  // Membership guard: a professor may only view a section they're enrolled in.
  // Admins are allowed through unconditionally.
  if (me.role !== "ADMIN") {
    const enrollment = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.sectionId, sectionId),
        eq(professorSections.professorId, me.id),
      ),
    });
    if (!enrollment) return notFound();
  }

  const studentEnrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.sectionId, sectionId),
    with: { student: true },
  });
  const students = studentEnrollments.map((e) => e.student);

  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.sectionId, sectionId),
    with: { professor: true },
  });
  const professors = professorEnrollments.map((e) => e.professor);

  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });
  const sectionQuizzes = quizSectionAssignments.map((qs) => qs.quiz);

  return (
    <AppShell
      role="professor"
      active="sections"
      topbarEyebrow="Faculty"
      topbarTitle={section.name}
    >
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: withBasePath("/dashboard/professor") },
          {
            label: "My sections",
            href: withBasePath("/dashboard/professor/sections"),
          },
          { label: section.name },
        ]}
        eyebrow="Section"
        title={section.name}
        description={
          section.course
            ? `${section.course.title}${
                section.course.description
                  ? ` · ${section.course.description}`
                  : ""
              }`
            : "Section detail"
        }
        actions={
          <Button asChild variant="outline">
            <a
              href={withBasePath(
                `/dashboard/professor/sections/${section.id}/gradebook`,
              )}
            >
              Gradebook
            </a>
          </Button>
        }
      />

      <section className="mt-12">
        <SectionHeading eyebrow="Codes" title="Enrolment access" />
        <div className="mt-6 paper paper-shadow p-6 flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            {section.course ? (
              <Badge variant="outline">{section.course.title}</Badge>
            ) : null}
            <Badge variant="info">{students.length} learners</Badge>
            <Badge variant="default">{professors.length} faculty</Badge>
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

          <div className="pt-2">
            <LeaveSectionButton sectionId={section.id} />
          </div>
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Roster"
          title="Enrolled learners"
          description={`${students.length} ${
            students.length === 1 ? "learner" : "learners"
          }`}
        />
        <div className="mt-6">
          {students.length === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title="No learners enrolled yet."
              description="Share the learner code above with your students to get them enrolled."
            />
          ) : (
            <ul className="paper paper-shadow divide-y divide-rule overflow-hidden">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <span className="font-medium text-ink">
                    {student.firstName} {student.lastName}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {student.email}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-16">
        <SectionHeading
          eyebrow="Coursework"
          title="Assigned quizzes"
          description={`${sectionQuizzes.length} ${
            sectionQuizzes.length === 1 ? "quiz" : "quizzes"
          }`}
        />
        <div className="mt-6">
          {sectionQuizzes.length === 0 ? (
            <EmptyState
              eyebrow="Empty"
              title="No quizzes assigned."
              description="Assign a quiz to this section from the My quizzes page."
            />
          ) : (
            <ul className="paper paper-shadow divide-y divide-rule overflow-hidden">
              {sectionQuizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="px-6 py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-ink">{quiz.title}</span>
                    {cleanQuizDescription(quiz.description) ? (
                      <span className="text-xs text-ink-faint line-clamp-1">
                        {cleanQuizDescription(quiz.description)}
                      </span>
                    ) : null}
                  </div>
                  <UnassignQuizButton quizId={quiz.id} sectionId={sectionId} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </AppShell>
  );
}
