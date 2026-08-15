/**
 * Shared Zod shapes for quiz create/update so professor and admin routes
 * enforce the same field length caps.
 */
import { z } from 'zod';

export const quizQuestionInputSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER']),
  question: z.string().min(1).max(4_000),
  options: z.array(z.string().max(2_000)).max(12).optional(),
  correctAnswer: z.string().max(2_000).optional(),
  points: z.number().min(1).max(100).default(1),
  order: z.number().min(0).max(500),
});

export const quizCreateBaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(8_000).optional(),
  sectionIds: z
    .array(z.string().min(1))
    .min(1, 'Select at least one section')
    .max(50),
  maxAttempts: z.number().min(1).max(10).default(1),
  timeLimit: z.number().min(1).max(24 * 60).optional(),
  passingScore: z.number().int().min(0).max(100).default(60),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  questions: z.array(quizQuestionInputSchema).max(200),
});
