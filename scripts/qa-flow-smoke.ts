/**
 * Mimic professor + student dashboard button flows against knowledge-dev
 * (library/service layer — no browser, no MCP).
 *
 * Run: npx tsx --env-file=.env.local scripts/qa-flow-smoke.ts --confirm-dev-db
 */
import './lib/bootstrapDevDb';

import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/app/db';
import {
  courses,
  lessonSections,
  lessons,
  professorSections,
  sections,
  studentSections,
  users,
} from '@/app/db/schema';
import { getCourseAnalytics } from '@/lib/analytics';
import {
  listTeachableCourses,
  listCourseMaterials,
  assertCanManageCourse,
} from '@/lib/knowledge';
import { assertSafeMaterialUrl } from '@/lib/knowledge/urlSafety';
import {
  assertStudentCanAccessLesson,
  buildSafeLessonsContext,
  createLessonFromAuthoring,
  getStudentLessonDetail,
  listStudentLessons,
  setLessonVisibility,
  upsertLessonProgress,
} from '@/lib/learning';

function code() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function main() {
  const rows = await db.query.users.findMany({
    columns: { id: true, email: true, clerkId: true, platformStaff: true },
  });
  const byEmail = Object.fromEntries(rows.map((u) => [u.email.toLowerCase(), u]));

  const profEmail = 'yasawant@asu.edu';
  const stuEmail = 'yashasawant2203@gmail.com';
  const profRow = byEmail[profEmail];
  const stuRow = byEmail[stuEmail];
  if (!profRow || !stuRow) {
    throw new Error(`Missing users: need ${profEmail} and ${stuEmail}`);
  }

  const professor = { ...profRow };
  const student = { ...stuRow };
  console.log('users', { professor: professor.email, student: student.email });

  // Seed course + two sections if empty
  let course = await db.query.courses.findFirst({
    where: and(eq(courses.title, 'QA Knowledge Smoke'), isNull(courses.deletedAt)),
  });
  if (!course) {
    const { DEFAULT_WORKSPACE_ID } = await import('@/app/db/schema');
    const { ensureDefaultWorkspace } = await import('@/lib/workspace');
    await ensureDefaultWorkspace();
    const [c] = await db
      .insert(courses)
      .values({
        workspaceId: DEFAULT_WORKSPACE_ID,
        tenantId: DEFAULT_WORKSPACE_ID,
        title: 'QA Knowledge Smoke',
        description: 'Programmatic QA course',
        status: 'ACTIVE',
        isActive: true,
      })
      .returning();
    course = c;
  }

  let sectionA = await db.query.sections.findFirst({
    where: and(
      eq(sections.courseId, course.id),
      eq(sections.name, 'Section A'),
      isNull(sections.deletedAt),
    ),
  });
  let sectionB = await db.query.sections.findFirst({
    where: and(
      eq(sections.courseId, course.id),
      eq(sections.name, 'Section B'),
      isNull(sections.deletedAt),
    ),
  });
  if (!sectionA) {
    const [s] = await db
      .insert(sections)
      .values({
        courseId: course.id,
        name: 'Section A',
        professorEnrollmentCode: code(),
        studentEnrollmentCode: code(),
      })
      .returning();
    sectionA = s;
  }
  if (!sectionB) {
    const [s] = await db
      .insert(sections)
      .values({
        courseId: course.id,
        name: 'Section B',
        professorEnrollmentCode: code(),
        studentEnrollmentCode: code(),
      })
      .returning();
    sectionB = s;
  }

  // Enroll professor in both; student only in A
  for (const sid of [sectionA.id, sectionB.id]) {
    const exists = await db.query.professorSections.findFirst({
      where: and(
        eq(professorSections.professorId, professor.id),
        eq(professorSections.sectionId, sid),
      ),
    });
    if (!exists) {
      await db.insert(professorSections).values({
        professorId: professor.id,
        sectionId: sid,
        status: 'ACTIVE',
      });
    }
  }
  const stuEnroll = await db.query.studentSections.findFirst({
    where: and(
      eq(studentSections.studentId, student.id),
      eq(studentSections.sectionId, sectionA.id),
    ),
  });
  if (!stuEnroll) {
    await db.insert(studentSections).values({
      studentId: student.id,
      sectionId: sectionA.id,
      status: 'ACTIVE',
    });
  }

  // --- Professor: Materials course picker ---
  const teachable = await listTeachableCourses(professor);
  console.log(
    'prof.materials.picker',
    teachable.some((c) => c.id === course.id) ? 'PASS' : 'FAIL',
    teachable.map((c) => c.title),
  );

  await assertCanManageCourse(professor, course.id);
  const mats = await listCourseMaterials(professor, course.id);
  console.log('prof.materials.list', 'PASS', { count: mats.length });

  // SSRF gate (button would reject bad URL before insert)
  let ssrfOk = false;
  try {
    assertSafeMaterialUrl('http://127.0.0.1/secret');
  } catch {
    ssrfOk = true;
  }
  console.log('prof.materials.ssrf_block', ssrfOk ? 'PASS' : 'FAIL');

  // Foreign course denied
  let foreignDenied = false;
  try {
    await assertCanManageCourse(
      professor,
      '00000000-0000-4000-8000-000000000099',
    );
  } catch {
    foreignDenied = true;
  }
  console.log('prof.course.foreign_denied', foreignDenied ? 'PASS' : 'FAIL');

  // --- Professor: create + release lesson to A only; another to B only ---
  const lessonA = await createLessonFromAuthoring(professor, {
    courseId: course.id,
    title: 'Lesson for A',
    markdown: 'Secret notes for Section A only. Photosynthesis basics.',
    sectionIds: [sectionA.id],
    flashcards: [{ front: 'ATP?', back: 'Energy currency' }],
    isActive: false,
  });
  await setLessonVisibility(professor, lessonA.id, true);

  const lessonB = await createLessonFromAuthoring(professor, {
    courseId: course.id,
    title: 'Lesson for B',
    markdown: 'Secret notes for Section B only. Should not leak to A.',
    sectionIds: [sectionB.id],
    isActive: false,
  });
  await setLessonVisibility(professor, lessonB.id, true);
  console.log('prof.authoring.publish_release_lessons', 'PASS', {
    lessonA: lessonA.id,
    lessonB: lessonB.id,
  });

  // Bad sectionIds rejected
  let badSectionDenied = false;
  try {
    await createLessonFromAuthoring(professor, {
      courseId: course.id,
      title: 'Bad',
      markdown: 'x',
      sectionIds: ['00000000-0000-4000-8000-000000000011'],
    });
  } catch {
    badSectionDenied = true;
  }
  console.log(
    'prof.authoring.invalid_sectionIds',
    badSectionDenied ? 'PASS' : 'FAIL',
  );

  // --- Analytics (dashboard view) ---
  const analytics = await getCourseAnalytics(professor, course.id, {
    audit: false,
  });
  console.log('prof.analytics.view', 'PASS', {
    tagCoverage: analytics.tagCoverage,
    lessons: analytics.lessons.map((l) => ({
      title: l.title,
      roster: l.rosterCount,
      completed: l.completed,
      rate: l.completionRate,
    })),
  });

  // --- Student: My Lessons ---
  const stuLessons = await listStudentLessons(student.id);
  const seesA = stuLessons.some((l) => l.id === lessonA.id);
  const seesB = stuLessons.some((l) => l.id === lessonB.id);
  console.log('stu.lessons.list', seesA && !seesB ? 'PASS' : 'FAIL', {
    titles: stuLessons.map((l) => l.title),
  });

  const detail = await getStudentLessonDetail(student.id, lessonA.id);
  console.log('stu.lessons.open', detail ? 'PASS' : 'FAIL', {
    title: detail?.title,
    flashcards: detail?.flashcards?.length ?? 0,
  });

  let deniedB = false;
  try {
    await assertStudentCanAccessLesson(student.id, lessonB.id);
  } catch {
    deniedB = true;
  }
  console.log('stu.lessons.cross_section_denied', deniedB ? 'PASS' : 'FAIL');

  await upsertLessonProgress(student.id, lessonA.id, 'STARTED');
  await upsertLessonProgress(student.id, lessonA.id, 'COMPLETED');
  console.log('stu.lessons.progress', 'PASS');

  // Tutor RAG: section A must not see B lesson text
  const ctxA = await buildSafeLessonsContext(course.id, 'secret notes', {
    sectionId: sectionA.id,
  });
  const ragOk =
    ctxA.includes('Section A') && !ctxA.includes('Section B only');
  console.log('tutor.lessons.section_scoped', ragOk ? 'PASS' : 'FAIL', {
    snippet: ctxA.slice(0, 120),
  });

  const ctxNoSection = await buildSafeLessonsContext(course.id, 'secret');
  console.log(
    'tutor.lessons.no_section_empty',
    ctxNoSection === '' ? 'PASS' : 'FAIL',
  );

  // Cleanup soft: leave data for inspection; print ids
  console.log('seed', {
    courseId: course.id,
    sectionA: sectionA.id,
    sectionB: sectionB.id,
    lessonA: lessonA.id,
    lessonB: lessonB.id,
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
