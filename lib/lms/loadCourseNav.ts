import {
  courseLmsShellEnabled,
  normalizeCourseNav,
  type CourseLmsNavigation,
  type CourseToolId,
  visibleFacultyTools,
  visibleStudentTools,
} from '@/lib/lms/courseNav';
import { getCourseLmsNavDefiner } from '@/lib/db/lmsDefiners';

export async function loadCourseNav(courseId: string): Promise<{
  enabled: boolean;
  nav: CourseLmsNavigation;
  syllabusMarkdown: string | null;
  facultyTools: CourseToolId[];
  studentTools: CourseToolId[];
}> {
  const enabled = courseLmsShellEnabled();
  if (!enabled) {
    const nav = normalizeCourseNav(null);
    return {
      enabled: false,
      nav,
      syllabusMarkdown: null,
      facultyTools: ['home'],
      studentTools: ['home'],
    };
  }
  const row = await getCourseLmsNavDefiner(courseId);
  const nav = normalizeCourseNav(row?.navigation ?? null);
  return {
    enabled: true,
    nav,
    syllabusMarkdown: row?.syllabusMarkdown ?? null,
    facultyTools: visibleFacultyTools(nav),
    studentTools: visibleStudentTools(nav),
  };
}
