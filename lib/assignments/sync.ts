import type { ActivityType } from '@/lib/assignments/types';
import {
  setCourseActivityActiveDefiner,
  softDeleteCourseActivityDefiner,
  syncCourseActivityDefiner,
} from '@/lib/db/facultyWriteDefiners';

type UpsertBase = {
  courseId?: string | null;
  professorId: string;
  title: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  isActive?: boolean;
  sourceOutlineItemId?: string | null;
  position?: number;
  tenantId?: string | null;
};

export async function upsertActivityForQuiz(
  quizId: string,
  data: UpsertBase,
) {
  return upsertByEntity('QUIZ', { quizId }, data);
}

export async function upsertActivityForLesson(
  lessonId: string,
  data: UpsertBase,
) {
  return upsertByEntity('LESSON', { lessonId }, data);
}

export async function upsertActivityForDiscussion(
  chatbotId: string,
  data: UpsertBase,
) {
  return upsertByEntity('DISCUSSION', { chatbotId }, data);
}

export async function upsertActivityForInteractive(
  interactiveId: string,
  data: UpsertBase,
) {
  return upsertByEntity('INTERACTIVE', { interactiveId }, data);
}

async function upsertByEntity(
  type: ActivityType,
  entity: {
    quizId?: string;
    lessonId?: string;
    chatbotId?: string;
    interactiveId?: string;
  },
  data: UpsertBase,
) {
  return syncCourseActivityDefiner({
    type,
    quizId: entity.quizId ?? null,
    lessonId: entity.lessonId ?? null,
    chatbotId: entity.chatbotId ?? null,
    interactiveId: entity.interactiveId ?? null,
    courseId: data.courseId ?? null,
    professorId: data.professorId,
    title: data.title,
    description: data.description ?? null,
    startDate: data.startDate?.toISOString() ?? null,
    endDate: data.endDate?.toISOString() ?? null,
    isActive: data.isActive ?? true,
    sourceOutlineItemId: data.sourceOutlineItemId ?? null,
    position: data.position ?? 0,
    tenantId: data.tenantId ?? null,
  });
}

export async function softDeleteActivityByEntity(entity: {
  quizId?: string;
  lessonId?: string;
  chatbotId?: string;
  interactiveId?: string;
}) {
  await softDeleteCourseActivityDefiner({
    quizId: entity.quizId ?? null,
    lessonId: entity.lessonId ?? null,
    chatbotId: entity.chatbotId ?? null,
    interactiveId: entity.interactiveId ?? null,
  });
}

export async function setActivityActiveByEntity(
  entity: {
    quizId?: string;
    lessonId?: string;
    chatbotId?: string;
    interactiveId?: string;
  },
  isActive: boolean,
) {
  await setCourseActivityActiveDefiner({
    quizId: entity.quizId ?? null,
    lessonId: entity.lessonId ?? null,
    chatbotId: entity.chatbotId ?? null,
    interactiveId: entity.interactiveId ?? null,
    isActive,
  });
}
