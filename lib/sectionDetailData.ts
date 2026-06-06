import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  attempts,
  professorSections,
  quizSections,
  sections,
  studentSections,
} from '@/app/db/schema';
import { comparePersonsByLastName } from '@/lib/personName';
import { activeOnly } from '@/lib/db/filters';

export type SectionEnrollmentRow = {
  id: string;
  enrolledAt: Date;
  status: string;
  person: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
};

export type SectionQuizRow = {
  id: string;
  title: string;
  description: string | null;
  endDate: Date | null;
  submissionCount: number;
};

export type SectionDetailData = {
  section: {
    id: string;
    name: string;
    courseId: string;
    professorEnrollmentCode: string;
    studentEnrollmentCode: string;
    createdAt: Date;
    updatedAt: Date;
    course: {
      id: string;
      title: string;
      description: string | null;
    } | null;
  };
  learnerEnrollments: SectionEnrollmentRow[];
  facultyEnrollments: SectionEnrollmentRow[];
  activeLearnerCount: number;
  activeFacultyCount: number;
  quizzes: SectionQuizRow[];
};

export async function loadSectionDetailData(
  sectionId: string,
): Promise<SectionDetailData | null> {
  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), activeOnly(sections.deletedAt)),
    with: { course: true },
  });
  if (!section) return null;

  const studentEnrollments = await db.query.studentSections.findMany({
    where: eq(studentSections.sectionId, sectionId),
    with: { student: true },
  });

  const professorEnrollments = await db.query.professorSections.findMany({
    where: eq(professorSections.sectionId, sectionId),
    with: { professor: true },
  });

  const quizSectionAssignments = await db.query.quizSections.findMany({
    where: eq(quizSections.sectionId, sectionId),
    with: { quiz: true },
  });

  const sectionQuizzes = quizSectionAssignments
    .map((qs) => qs.quiz)
    .filter((q): q is NonNullable<(typeof quizSectionAssignments)[0]['quiz']> =>
      q != null && q.deletedAt == null,
    );

  const quizIds = sectionQuizzes.map((q) => q.id);
  const submissionCountByQuizId: Record<string, number> = {};

  if (quizIds.length > 0) {
    const submissionRows = await db
      .select({
        quizId: attempts.quizId,
        count: sql<number>`count(*)::int`,
      })
      .from(attempts)
      .where(
        and(
          eq(attempts.sectionId, sectionId),
          inArray(attempts.quizId, quizIds),
          isNotNull(attempts.submittedAt),
        ),
      )
      .groupBy(attempts.quizId);

    for (const row of submissionRows) {
      submissionCountByQuizId[row.quizId] = row.count;
    }
  }

  const learnerEnrollments: SectionEnrollmentRow[] = studentEnrollments
    .map((e) => ({
      id: e.id,
      enrolledAt: e.enrolledAt,
      status: e.status,
      person: {
        id: e.student.id,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        email: e.student.email,
      },
    }))
    .sort((a, b) => comparePersonsByLastName(a.person, b.person));

  const facultyEnrollments: SectionEnrollmentRow[] = professorEnrollments
    .map((e) => ({
      id: e.id,
      enrolledAt: e.enrolledAt,
      status: e.status,
      person: {
        id: e.professor.id,
        firstName: e.professor.firstName,
        lastName: e.professor.lastName,
        email: e.professor.email,
      },
    }))
    .sort((a, b) => comparePersonsByLastName(a.person, b.person));

  return {
    section: {
      id: section.id,
      name: section.name,
      courseId: section.courseId,
      professorEnrollmentCode: section.professorEnrollmentCode,
      studentEnrollmentCode: section.studentEnrollmentCode,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      course: section.course
        ? {
            id: section.course.id,
            title: section.course.title,
            description: section.course.description,
          }
        : null,
    },
    learnerEnrollments,
    facultyEnrollments,
    activeLearnerCount: learnerEnrollments.filter((e) => e.status === 'ACTIVE')
      .length,
    activeFacultyCount: facultyEnrollments.filter((e) => e.status === 'ACTIVE')
      .length,
    quizzes: sectionQuizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      endDate: quiz.endDate,
      submissionCount: submissionCountByQuizId[quiz.id] ?? 0,
    })),
  };
}
