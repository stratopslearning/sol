import { cookies } from 'next/headers';

import type { AuthzUser } from '@/lib/authz/courseAccess';
import {
  listTeachableCourses,
  type TeachableCourse,
} from '@/lib/knowledge';

export const ACTIVE_COURSE_COOKIE = 'sol_course_id';

export type ResolveCourseResult =
  | { ok: true; courseId: string }
  | { ok: false; code: 'missing' | 'forbidden'; message: string };

function pickFromCookieOrSole(
  courses: TeachableCourse[],
  fromCookie: string | undefined,
): string | null {
  const allowed = new Set(courses.map((c) => c.id));
  if (fromCookie && allowed.has(fromCookie)) return fromCookie;
  if (courses.length === 1) return courses[0]!.id;
  return null;
}

/** Resolve active course id from a preloaded teachable list + cookie. */
export async function getActiveCourseIdFromList(
  courses: TeachableCourse[],
): Promise<string | null> {
  const jar = await cookies();
  const fromCookie = jar.get(ACTIVE_COURSE_COOKIE)?.value?.trim();
  return pickFromCookieOrSole(courses, fromCookie);
}

/** Resolve active course for a faculty user (cookie, then sole teachable course). */
export async function getActiveCourseId(
  user: AuthzUser,
): Promise<string | null> {
  const courses = await listTeachableCourses(user);
  return getActiveCourseIdFromList(courses);
}

/** Pick course id from explicit param, cookie, or sole course (preloaded list). */
export async function resolveProfessorCourseIdFromList(
  courses: TeachableCourse[],
  explicitCourseId?: string | null,
): Promise<ResolveCourseResult> {
  const allowed = new Set(courses.map((c) => c.id));
  const trimmed = explicitCourseId?.trim();

  if (trimmed) {
    if (!allowed.has(trimmed)) {
      return {
        ok: false,
        code: 'forbidden',
        message: 'You cannot manage that course.',
      };
    }
    return { ok: true, courseId: trimmed };
  }

  const active = await getActiveCourseIdFromList(courses);
  if (active) return { ok: true, courseId: active };

  if (courses.length > 1) {
    return {
      ok: false,
      code: 'missing',
      message:
        'Multiple courses available. Pass courseId or choose an active course.',
    };
  }
  return {
    ok: false,
    code: 'missing',
    message: 'No teachable courses.',
  };
}

/** Pick course id from explicit param, cookie, or sole teachable course. */
export async function resolveProfessorCourseId(
  user: AuthzUser,
  explicitCourseId?: string | null,
): Promise<ResolveCourseResult> {
  const courses = await listTeachableCourses(user);
  return resolveProfessorCourseIdFromList(courses, explicitCourseId);
}
