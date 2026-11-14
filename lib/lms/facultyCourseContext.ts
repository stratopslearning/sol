import { notFound } from 'next/navigation';

import { requireTeachingAccess } from '@/lib/authz/gates';
import { assertCanManageCourse } from '@/lib/knowledge';
import { loadCourseNav } from '@/lib/lms/loadCourseNav';
import type { CourseToolId } from '@/lib/lms/courseNav';

export async function requireFacultyCourse(courseId: string) {
  const user = await requireTeachingAccess();
  let course: { id: string; title: string; workspaceId: string | null };
  try {
    course = await assertCanManageCourse(user, courseId);
  } catch {
    notFound();
  }
  const lms = await loadCourseNav(courseId);
  return { user, course, lms };
}

export function facultyActiveTool(
  tool: CourseToolId,
  enabled: boolean,
): CourseToolId | 'overview' {
  if (!enabled && tool === 'home') return 'overview';
  return tool;
}
