/**
 * Course-scoped prompt placeholders (subject, level, tone, policy).
 */
import { eq } from 'drizzle-orm';

import { db } from '@/app/db';
import { courses } from '@/app/db/schema';
import { getAuthoringPolicyForCourse } from '@/lib/authoring/policies';
import { formatAuthoringPolicyPrompt } from '@/lib/ai/prompts/authoring';
import {
  parseAiPolicy,
  type TutorAiPolicy,
} from '@/lib/chatbot/aiPolicy';

export type CoursePromptContext = {
  courseId: string;
  courseTitle: string;
  courseSubject: string;
  courseLevel: string;
  feedbackTone: string;
  tutorMode: TutorAiPolicy['mode'];
  authoringPolicy: string;
  rubricStyle: string;
};

const DEFAULTS = {
  subject: 'General',
  level: 'undergraduate',
  feedbackTone: 'supportive',
  tutorMode: 'guided' as const,
};

export async function loadCoursePromptContext(
  courseId: string,
): Promise<CoursePromptContext> {
  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    columns: {
      id: true,
      title: true,
      subject: true,
      level: true,
      feedbackTone: true,
      aiPolicy: true,
    },
  });

  const policy = await getAuthoringPolicyForCourse(courseId).catch(() => null);
  const tutorPolicy = parseAiPolicy(course?.aiPolicy) ?? { mode: DEFAULTS.tutorMode };

  return {
    courseId,
    courseTitle: course?.title?.trim() || 'this course',
    courseSubject: course?.subject?.trim() || DEFAULTS.subject,
    courseLevel: course?.level?.trim() || DEFAULTS.level,
    feedbackTone: course?.feedbackTone?.trim() || DEFAULTS.feedbackTone,
    tutorMode: tutorPolicy.mode,
    authoringPolicy: formatAuthoringPolicyPrompt(policy).trim() || 'None specified.',
    rubricStyle: policy?.rubricStyle?.trim() || 'Clear, observable criteria with partial credit where appropriate.',
  };
}

/** Lightweight defaults when no courseId is available (evals / offline). */
export function defaultCoursePromptContext(
  overrides: Partial<CoursePromptContext> = {},
): CoursePromptContext {
  return {
    courseId: '',
    courseTitle: 'this course',
    courseSubject: DEFAULTS.subject,
    courseLevel: DEFAULTS.level,
    feedbackTone: DEFAULTS.feedbackTone,
    tutorMode: DEFAULTS.tutorMode,
    authoringPolicy: 'None specified.',
    rubricStyle:
      'Clear, observable criteria with partial credit where appropriate.',
    ...overrides,
  };
}
