/**
 * MCP tool catalog for the SOL professor server.
 *
 * Every tool wraps a `lib/professor/*` service, so authorization (section
 * enrollment, quiz ownership, role checks) and audit logging behave exactly
 * like the dashboard. Tools never expose more than the professor could see
 * in the UI. Destructive tools require an explicit `confirm: true` argument.
 */
import { z } from 'zod';

import type { ProfessorApiAuth } from '@/lib/api/professorAuth';
import type { TokenScope } from '@/lib/professorApiTokens';
import {
  getProfessorSectionDetail,
  listProfessorSections,
} from '@/lib/professor/sections';
import {
  getProfessorQuiz,
  listProfessorQuizzes,
} from '@/lib/professor/quizzes';
import {
  exportResultsCsv,
  getAttemptDetail,
  getSectionGradebook,
  listQuizAttempts,
} from '@/lib/professor/grading';
import {
  getDiscussionSession,
  getProfessorDiscussion,
  listDiscussionSessions,
  listProfessorDiscussions,
} from '@/lib/professor/discussions';
import {
  archiveQuiz,
  assignDiscussion,
  assignQuizSections,
  createDiscussion,
  createQuiz,
  duplicateDiscussion,
  duplicateQuiz,
  enrollInSection,
  leaveSection,
  regradeAttemptForProfessor,
  regradeAttentionBatch,
  sectionCopyQuiz,
  setSectionEndsAt,
  unassignDiscussionFromSection,
  unassignQuizFromSection,
  updateDiscussion,
  updateQuiz,
} from '@/lib/professor/mutations';
import { getAttentionItemsForProfessor } from '@/lib/professorAttention';

export interface McpToolContext {
  auth: ProfessorApiAuth;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  /** Token scope required; null = any authenticated token. */
  scope: TokenScope | null;
  /** Destructive tools must be called with `confirm: true`. */
  destructive?: boolean;
  handler: (args: Record<string, unknown>, ctx: McpToolContext) => Promise<unknown>;
}

const confirmField = z
  .boolean()
  .describe('Must be true. Confirms the user approved this destructive action.');

const questionSchema = z.object({
  id: z.string().uuid().optional().describe('Existing question id (updates only)'),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
  question: z.string().min(1).describe('The question text / stem'),
  options: z
    .array(z.string())
    .optional()
    .describe('Answer options (MULTIPLE_CHOICE only)'),
  correctAnswer: z
    .string()
    .optional()
    .describe(
      'Correct option text for MULTIPLE_CHOICE, "true"/"false" for TRUE_FALSE, reference answer for SHORT_ANSWER',
    ),
  points: z.number().int().min(1).default(1),
  order: z.number().int().min(0).describe('0-based display order'),
});

export const MCP_TOOLS: McpToolDefinition[] = [
  // ---- Me ------------------------------------------------------------
  {
    name: 'whoami',
    description:
      'Who am I? Returns the authenticated professor (name, email, role) and the scopes this token has.',
    schema: z.object({}),
    scope: null,
    handler: async (_args, ctx) => ({
      id: ctx.auth.user.id,
      name:
        [ctx.auth.user.firstName, ctx.auth.user.lastName]
          .filter(Boolean)
          .join(' ') || ctx.auth.user.email,
      email: ctx.auth.user.email,
      role: ctx.auth.user.role,
      scopes: ctx.auth.scopes,
    }),
  },
  {
    name: 'list_capabilities',
    description:
      'List every SOL tool available, its required scope, and whether this token can call it.',
    schema: z.object({}),
    scope: null,
    handler: async (_args, ctx) => ({
      tools: MCP_TOOLS.map((t) => ({
        name: t.name,
        scope: t.scope,
        allowed: t.scope == null || ctx.auth.scopes.includes(t.scope),
        destructive: Boolean(t.destructive),
      })),
    }),
  },

  // ---- Sections -------------------------------------------------------
  {
    name: 'list_sections',
    description:
      'List sections I teach, split into active and archived (concluded). Includes course, learner count, and end date.',
    schema: z.object({}),
    scope: 'read',
    handler: (_args, ctx) => listProfessorSections(ctx.auth.user),
  },
  {
    name: 'get_section',
    description:
      'Full detail for one section I teach: roster (learners + faculty), enrollment codes, assigned quizzes with submission counts, and discussions.',
    schema: z.object({ sectionId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getProfessorSectionDetail(ctx.auth.user, args.sectionId as string),
  },
  {
    name: 'enroll_section',
    description:
      'Enroll me (as teaching faculty) into a section using its professor enrollment code.',
    schema: z.object({
      enrollmentCode: z.string().min(1).describe('Professor enrollment code'),
    }),
    scope: 'sections:write',
    handler: (args, ctx) =>
      enrollInSection(ctx.auth.user, args.enrollmentCode as string),
  },
  {
    name: 'leave_section',
    description:
      'Leave a section I teach. I lose access to its roster and gradebook. Destructive: requires confirm=true.',
    schema: z.object({
      sectionId: z.string().uuid(),
      confirm: confirmField,
    }),
    scope: 'sections:write',
    destructive: true,
    handler: async (args, ctx) => {
      await leaveSection(ctx.auth.user, args.sectionId as string);
      return { success: true };
    },
  },
  {
    name: 'set_section_ends_at',
    description:
      'Set or clear a section end date (ISO datetime, or null to clear). After the end date, students see the section as archived and cannot start new work.',
    schema: z.object({
      sectionId: z.string().uuid(),
      endsAt: z
        .union([z.string(), z.null()])
        .describe('ISO datetime, or null to clear the end date'),
    }),
    scope: 'sections:write',
    handler: (args, ctx) =>
      setSectionEndsAt(
        ctx.auth.user,
        args.sectionId as string,
        (args.endsAt as string | null) ?? null,
      ),
  },
  {
    name: 'unassign_quiz_from_section',
    description:
      'Remove a quiz from one section I teach (the quiz itself is not deleted). Destructive: requires confirm=true.',
    schema: z.object({
      sectionId: z.string().uuid(),
      quizId: z.string().uuid(),
      confirm: confirmField,
    }),
    scope: 'sections:write',
    destructive: true,
    handler: async (args, ctx) => {
      await unassignQuizFromSection(
        ctx.auth.user,
        args.sectionId as string,
        args.quizId as string,
      );
      return { success: true };
    },
  },
  {
    name: 'unassign_discussion_from_section',
    description:
      'Remove a discussion bot from one section I teach (the discussion is not deleted). Destructive: requires confirm=true.',
    schema: z.object({
      sectionId: z.string().uuid(),
      discussionId: z.string().uuid(),
      confirm: confirmField,
    }),
    scope: 'sections:write',
    destructive: true,
    handler: async (args, ctx) => {
      await unassignDiscussionFromSection(
        ctx.auth.user,
        args.sectionId as string,
        args.discussionId as string,
      );
      return { success: true };
    },
  },

  // ---- Quizzes ----------------------------------------------------------
  {
    name: 'list_quizzes',
    description:
      'List quizzes assigned to sections I teach (mine and shared), with question counts, submission stats, and class averages.',
    schema: z.object({}),
    scope: 'read',
    handler: async (_args, ctx) => ({
      quizzes: await listProfessorQuizzes(ctx.auth.user),
    }),
  },
  {
    name: 'get_quiz',
    description:
      'Get one quiz with its questions and section assignments. Answer keys are included only if I own the quiz.',
    schema: z.object({ quizId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getProfessorQuiz(ctx.auth.user, args.quizId as string),
  },
  {
    name: 'create_quiz',
    description:
      'Create a quiz with questions and assign it to sections I teach. Supports MULTIPLE_CHOICE, TRUE_FALSE, and SHORT_ANSWER (AI-graded against the reference answer).',
    schema: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      sectionIds: z
        .array(z.string().uuid())
        .min(1)
        .describe('Sections to assign the quiz to (must teach all of them)'),
      maxAttempts: z.number().int().min(1).max(10).default(1),
      timeLimit: z.number().int().min(1).optional().describe('Minutes'),
      passingScore: z
        .number()
        .int()
        .min(0)
        .max(100)
        .default(60)
        .describe('Passing percentage threshold'),
      startDate: z.string().optional().describe('ISO datetime quiz opens'),
      endDate: z.string().optional().describe('ISO datetime quiz closes (due date)'),
      questions: z.array(questionSchema).min(1),
    }),
    scope: 'quizzes:write',
    handler: (args, ctx) =>
      createQuiz(
        ctx.auth.user,
        args as Parameters<typeof createQuiz>[1],
      ),
  },
  {
    name: 'update_quiz',
    description:
      'Update a quiz I own. Replaces title, settings, questions, and section assignments with the provided values (fetch with get_quiz first, then send the full updated definition).',
    schema: z.object({
      quizId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      sectionIds: z.array(z.string().uuid()).min(1),
      maxAttempts: z.number().int().min(1).max(10).default(1),
      timeLimit: z.number().int().min(1).optional(),
      passingScore: z.number().int().min(0).max(100).default(60),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isActive: z.boolean().default(true),
      questions: z.array(questionSchema).min(1),
    }),
    scope: 'quizzes:write',
    handler: (args, ctx) => {
      const { quizId, ...rest } = args as { quizId: string } & Parameters<
        typeof updateQuiz
      >[2];
      return updateQuiz(ctx.auth.user, quizId, rest);
    },
  },
  {
    name: 'duplicate_quiz',
    description:
      'Duplicate a quiz (mine or a co-taught one) into a new inactive copy I own, keeping questions and my section assignments.',
    schema: z.object({ quizId: z.string().uuid() }),
    scope: 'quizzes:write',
    handler: (args, ctx) =>
      duplicateQuiz(ctx.auth.user, args.quizId as string),
  },
  {
    name: 'archive_quiz',
    description:
      'Archive (soft-delete) a quiz I own. It disappears from all sections immediately. Destructive: requires confirm=true.',
    schema: z.object({
      quizId: z.string().uuid(),
      confirm: confirmField,
    }),
    scope: 'quizzes:write',
    destructive: true,
    handler: (args, ctx) => archiveQuiz(ctx.auth.user, args.quizId as string),
  },
  {
    name: 'section_copy_quiz',
    description:
      "Take ownership of a co-taught quiz for MY sections: creates an editable copy owned by me and moves my sections' assignments and attempts onto it. Destructive: requires confirm=true.",
    schema: z.object({
      quizId: z.string().uuid(),
      confirm: confirmField,
    }),
    scope: 'quizzes:write',
    destructive: true,
    handler: (args, ctx) =>
      sectionCopyQuiz(ctx.auth.user, args.quizId as string),
  },
  {
    name: 'assign_quiz_sections',
    description:
      'Assign a quiz I own to additional sections I teach (additive; existing assignments are kept).',
    schema: z.object({
      quizId: z.string().uuid(),
      sectionIds: z.array(z.string().uuid()).min(1),
    }),
    scope: 'quizzes:write',
    handler: (args, ctx) =>
      assignQuizSections(
        ctx.auth.user,
        args.quizId as string,
        args.sectionIds as string[],
      ),
  },

  // ---- Grading ----------------------------------------------------------
  {
    name: 'get_gradebook',
    description:
      'Gradebook matrix for a section I teach: best score per learner per quiz, plus each learner average. Education-record access (audited).',
    schema: z.object({ sectionId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getSectionGradebook(ctx.auth.user, args.sectionId as string),
  },
  {
    name: 'list_attempts',
    description:
      'Submitted attempts for a quiz across sections I teach (optionally one section). Education-record access (audited).',
    schema: z.object({
      quizId: z.string().uuid(),
      sectionId: z.string().uuid().optional(),
    }),
    scope: 'read',
    handler: async (args, ctx) => ({
      attempts: await listQuizAttempts(ctx.auth.user, args.quizId as string, {
        sectionId: args.sectionId as string | undefined,
      }),
    }),
  },
  {
    name: 'get_attempt',
    description:
      'Full detail for one attempt: answers, scores, and AI grading feedback. Education-record access (audited).',
    schema: z.object({ attemptId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getAttemptDetail(ctx.auth.user, args.attemptId as string),
  },
  {
    name: 'regrade_attempt',
    description:
      'Re-grade one submitted attempt in a section I teach. fallbackOnly=true (default) only re-grades questions stuck in pending/fallback state; false re-grades all short answers.',
    schema: z.object({
      attemptId: z.string().uuid(),
      fallbackOnly: z.boolean().default(true),
    }),
    scope: 'grades:write',
    handler: (args, ctx) =>
      regradeAttemptForProfessor(ctx.auth.user, args.attemptId as string, {
        fallbackOnly: (args.fallbackOnly as boolean | undefined) ?? true,
      }),
  },
  {
    name: 'list_attention',
    description:
      'Attempts needing my grading attention (stuck or failed AI grading) across sections I teach, with per-attempt pending counts.',
    schema: z.object({
      limit: z.number().int().min(1).max(100).default(50),
    }),
    scope: 'read',
    handler: async (args, ctx) => ({
      items: await getAttentionItemsForProfessor(ctx.auth.user.id, {
        limit: (args.limit as number | undefined) ?? 50,
      }),
    }),
  },
  {
    name: 'regrade_attention',
    description:
      'Re-grade a batch from my attention queue (up to 20 attempts, processed synchronously — may take a minute). Destructive: requires confirm=true because it calls the AI grader.',
    schema: z.object({
      limit: z.number().int().min(1).max(20).default(10),
      confirm: confirmField,
    }),
    scope: 'grades:write',
    destructive: true,
    handler: (args, ctx) =>
      regradeAttentionBatch(ctx.auth.user, {
        limit: (args.limit as number | undefined) ?? 10,
      }),
  },
  {
    name: 'export_results',
    description:
      'Export submitted quiz results as CSV text (student, quiz, score, attempt number). Optional quizId and dateFrom/dateTo (YYYY-MM-DD) filters. Education-record access (audited).',
    schema: z.object({
      quizId: z.string().uuid().optional(),
      dateFrom: z.string().optional().describe('YYYY-MM-DD inclusive'),
      dateTo: z.string().optional().describe('YYYY-MM-DD inclusive'),
    }),
    scope: 'read',
    handler: (args, ctx) =>
      exportResultsCsv(ctx.auth.user, {
        quizId: args.quizId as string | undefined,
        dateFrom: args.dateFrom as string | undefined,
        dateTo: args.dateTo as string | undefined,
      }),
  },

  // ---- Discussions --------------------------------------------------------
  {
    name: 'list_discussions',
    description:
      'List my Socratic discussion bots and available templates, with section assignments and linked quizzes.',
    schema: z.object({}),
    scope: 'read',
    handler: async (_args, ctx) => ({
      discussions: await listProfessorDiscussions(ctx.auth.user),
    }),
  },
  {
    name: 'get_discussion',
    description:
      'Get one discussion bot I own (or a template), including its instructions and system prompt.',
    schema: z.object({ discussionId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getProfessorDiscussion(ctx.auth.user, args.discussionId as string),
  },
  {
    name: 'create_discussion',
    description:
      'Create a Socratic discussion bot (persona, instructions shown to students, system prompt for the AI), optionally linked to a quiz and assigned to sections I teach.',
    schema: z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      personaName: z.string().min(1).max(100).default('Professor Emma'),
      instructions: z
        .string()
        .min(1)
        .max(10_000)
        .describe('Guidance shown to students'),
      systemPrompt: z
        .string()
        .min(1)
        .max(50_000)
        .describe('System prompt steering the AI persona'),
      relatedQuizId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe('Quiz to reference in learning mode (never leaks answer keys)'),
      sectionIds: z.array(z.string().uuid()).default([]),
    }),
    scope: 'discussions:write',
    handler: (args, ctx) =>
      createDiscussion(
        ctx.auth.user,
        args as Parameters<typeof createDiscussion>[1],
      ),
  },
  {
    name: 'update_discussion',
    description:
      'Update a discussion bot I own. Only provided fields change; sectionIds (when provided) replaces the assignment list.',
    schema: z.object({
      discussionId: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional(),
      personaName: z.string().min(1).max(100).optional(),
      instructions: z.string().min(1).max(10_000).optional(),
      systemPrompt: z.string().min(1).max(50_000).optional(),
      relatedQuizId: z.string().uuid().nullable().optional(),
      sectionIds: z.array(z.string().uuid()).optional(),
      isActive: z.boolean().optional(),
    }),
    scope: 'discussions:write',
    handler: (args, ctx) => {
      const { discussionId, ...rest } = args as {
        discussionId: string;
      } & Parameters<typeof updateDiscussion>[2];
      return updateDiscussion(ctx.auth.user, discussionId, rest);
    },
  },
  {
    name: 'duplicate_discussion',
    description:
      'Duplicate a template or one of my discussion bots into a new bot I own (required before assigning a template to sections).',
    schema: z.object({ discussionId: z.string().uuid() }),
    scope: 'discussions:write',
    handler: (args, ctx) =>
      duplicateDiscussion(ctx.auth.user, args.discussionId as string),
  },
  {
    name: 'assign_discussion',
    description:
      'Assign a discussion bot I own to sections I teach (additive).',
    schema: z.object({
      discussionId: z.string().uuid(),
      sectionIds: z.array(z.string().uuid()).min(1),
    }),
    scope: 'discussions:write',
    handler: (args, ctx) =>
      assignDiscussion(
        ctx.auth.user,
        args.discussionId as string,
        args.sectionIds as string[],
      ),
  },
  {
    name: 'list_discussion_sessions',
    description:
      'List completed student sessions for a discussion bot I own (student, section, message count).',
    schema: z.object({ discussionId: z.string().uuid() }),
    scope: 'read',
    handler: async (args, ctx) => ({
      sessions: await listDiscussionSessions(
        ctx.auth.user,
        args.discussionId as string,
      ),
    }),
  },
  {
    name: 'get_discussion_session',
    description:
      'Full transcript of one student discussion session. Education-record access (audited).',
    schema: z.object({ sessionId: z.string().uuid() }),
    scope: 'read',
    handler: (args, ctx) =>
      getDiscussionSession(ctx.auth.user, args.sessionId as string),
  },
];

export const MCP_TOOLS_BY_NAME = new Map(MCP_TOOLS.map((t) => [t.name, t]));
