import { requireStudent } from '@/lib/auth';
import { loadCourseNav } from '@/lib/lms/loadCourseNav';
import { requireStudentSectionAccess } from '@/lib/student/sectionAccess';
import type { CourseToolId } from '@/lib/lms/courseNav';

export async function requireStudentSectionLms(sectionId: string) {
  const user = await requireStudent();
  const ctx = await requireStudentSectionAccess(user.id, sectionId);
  const lms = await loadCourseNav(ctx.courseId);
  return { user, ctx, lms };
}

export function studentActiveTool(
  tool: CourseToolId,
  enabled: boolean,
): CourseToolId | 'overview' {
  if (!enabled && tool === 'home') return 'overview';
  return tool;
}
