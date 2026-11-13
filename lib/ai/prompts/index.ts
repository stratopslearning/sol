export {
  SOL_COMMON,
  PROMPT_VERSION,
  fillPrompt,
  withCommon,
} from '@/lib/ai/prompts/common';
export {
  loadCoursePromptContext,
  defaultCoursePromptContext,
  type CoursePromptContext,
} from '@/lib/ai/prompts/courseContext';
export * from '@/lib/ai/prompts/grader';
export * from '@/lib/ai/prompts/rubric';
export * from '@/lib/ai/prompts/tutor';
export * from '@/lib/ai/prompts/authoring';
export * from '@/lib/ai/prompts/review';
export * from '@/lib/ai/prompts/insights';
export * from '@/lib/ai/prompts/struggleTagger';
