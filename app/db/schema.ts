import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// All timestamps are timestamptz so the database always stores/returns UTC.
// The frontend formats with the user's timezone via date-fns-tz, but the wire
// format is unambiguous.
const ts = (name: string) => timestamp(name, { withTimezone: true });

// Users table - syncs with Clerk
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(), // Clerk's userId
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role', { enum: ['STUDENT', 'PROFESSOR', 'ADMIN'] }).default('STUDENT').notNull(),
  paid: boolean('paid').default(false).notNull(),
  // Stripe customer mapping for refund/dispute lookups. Nullable because
  // not every user has gone through checkout yet.
  stripeCustomerId: text('stripe_customer_id'),
  // Last time we synced this user with Clerk's source-of-truth profile.
  lastSyncedAt: ts('last_synced_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
});

// Courses table - Admin creates courses (no professor assignment at course level)
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).default('ACTIVE').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  // Soft-delete tombstone. Mutating queries set this; reads filter on it.
  deletedAt: ts('deleted_at'),
  createdAt: ts('created_at').defaultNow().notNull(),
  updatedAt: ts('updated_at').defaultNow().notNull(),
});

// Sections table - Admin creates sections within courses
export const sections = pgTable(
  'sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .references(() => courses.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(), // e.g., "Section A", "Morning Section"
    professorEnrollmentCode: text('professor_enrollment_code').unique().notNull(), // 6-character code for professors
    studentEnrollmentCode: text('student_enrollment_code').unique().notNull(), // 6-character code for students
    isActive: boolean('is_active').default(true).notNull(),
    /** When set and now > endsAt, section is concluded for students (Canvas-style). */
    endsAt: ts('ends_at'),
    deletedAt: ts('deleted_at'),
    createdAt: ts('created_at').defaultNow().notNull(),
    updatedAt: ts('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    courseIdx: index('sections_course_idx').on(table.courseId),
  }),
);

// Professor-Section enrollments - professors enroll in sections using codes
export const professorSections = pgTable(
  'professor_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    professorId: uuid('professor_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(),
    enrolledAt: ts('enrolled_at').defaultNow().notNull(),
    status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).default('ACTIVE').notNull(),
  },
  (table) => ({
    // One enrollment per (professor, section) — prevents duplicate joins.
    professorSectionUnique: uniqueIndex('professor_sections_unique').on(
      table.professorId,
      table.sectionId,
    ),
    sectionIdx: index('professor_sections_section_idx').on(table.sectionId),
  }),
);

// Student-Section enrollments - students enroll in sections using codes
export const studentSections = pgTable(
  'student_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(),
    enrolledAt: ts('enrolled_at').defaultNow().notNull(),
    status: text('status', { enum: ['ACTIVE', 'DROPPED'] }).default('ACTIVE').notNull(),
  },
  (table) => ({
    studentSectionUnique: uniqueIndex('student_sections_unique').on(
      table.studentId,
      table.sectionId,
    ),
    sectionIdx: index('student_sections_section_idx').on(table.sectionId),
  }),
);

// Quizzes table - professors create and own quizzes
export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    professorId: uuid('professor_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(), // Professor who created the quiz
    maxAttempts: integer('max_attempts').default(1).notNull(), // Maximum attempts allowed
    timeLimit: integer('time_limit'), // in minutes
    // Percentage threshold (0-100) for `attempts.passed`. Default 60.
    passingScore: integer('passing_score').default(60).notNull(),
    startDate: ts('start_date'), // Quiz start date
    endDate: ts('end_date'), // Quiz end date
    isActive: boolean('is_active').default(true).notNull(),
    deletedAt: ts('deleted_at'),
    createdAt: ts('created_at').defaultNow().notNull(),
    updatedAt: ts('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    professorIdx: index('quizzes_professor_idx').on(table.professorId),
  }),
);

// Quiz-Section assignments - quizzes assigned to sections
export const quizSections = pgTable(
  'quiz_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .references(() => quizzes.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(),
    assignedBy: uuid('assigned_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(), // who assigned (professor or admin)
    assignedAt: ts('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    quizSectionUnique: uniqueIndex('quiz_sections_unique').on(
      table.quizId,
      table.sectionId,
    ),
    sectionIdx: index('quiz_sections_section_idx').on(table.sectionId),
  }),
);

// Questions table
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .references(() => quizzes.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type', { enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] }).notNull(),
    question: text('question').notNull(),
    options: jsonb('options'), // For MCQ: ["option1", "option2", ...]
    correctAnswer: text('correct_answer'), // For MCQ/TF: "option1" or "true"
    points: integer('points').default(1).notNull(),
    order: integer('order').notNull(),
    // Auto-derived rubric used to deterministically grade SHORT_ANSWER. Stored as
    // `RubricCriterion[]` from `lib/gradingTypes`. Null until first grade.
    rubric: jsonb('rubric'),
    // Bumped whenever the question text or reference answer changes; used as a
    // cache-invalidation token for `grading_cache` lookups.
    rubricVersion: integer('rubric_version').default(1).notNull(),
    createdAt: ts('created_at').defaultNow().notNull(),
  },
  (table) => ({
    quizIdx: index('questions_quiz_idx').on(table.quizId),
  }),
);

// Assignments table - links students to quizzes
export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .references(() => quizzes.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    dueDate: ts('due_date'),
    isCompleted: boolean('is_completed').default(false).notNull(),
    assignedAt: ts('assigned_at').defaultNow().notNull(),
    completedAt: ts('completed_at'),
  },
  (table) => ({
    // One assignment per (quiz, student). Prevents the duplicate-assignment
    // bug where a student would otherwise see N copies of the same quiz.
    quizStudentUnique: uniqueIndex('assignments_quiz_student_unique').on(
      table.quizId,
      table.studentId,
    ),
    studentIdx: index('assignments_student_idx').on(table.studentId),
  }),
);

// Attempts table - student quiz submissions
export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .references(() => assignments.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    quizId: uuid('quiz_id')
      .references(() => quizzes.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(), // Track which section context
    answers: jsonb('answers').notNull(), // { questionId: answer }
    score: integer('score'), // total points earned
    maxScore: integer('max_score').notNull(), // total possible points
    percentage: integer('percentage'), // score as percentage
    passed: boolean('passed'), // based on passing score
    gptFeedback: jsonb('gpt_feedback'), // AI feedback for short answers
    // 'complete' = everything graded. 'partial' = at least one short-answer
    // question is still `pending` inside gpt_feedback; the background cron
    // worker will retry it. 'failed' = grading is stuck after retries and
    // requires professor manual_review.
    gradingStatus: text('grading_status', {
      enum: ['complete', 'partial', 'failed'],
    }),
    startedAt: ts('started_at').defaultNow().notNull(),
    submittedAt: ts('submitted_at'),
  },
  (table) => ({
    assignmentIdx: index('attempts_assignment_idx').on(table.assignmentId),
    studentIdx: index('attempts_student_idx').on(table.studentId),
    quizIdx: index('attempts_quiz_idx').on(table.quizId),
    sectionIdx: index('attempts_section_idx').on(table.sectionId),
    // Partial indexes live in SQL migrations (Drizzle cannot express predicates):
    // - attempts_grading_status_idx (0005): WHERE grading_status IS NOT NULL AND <> 'complete'
    // - attempts_one_open_per_assignment_idx (0007): UNIQUE(assignment_id) WHERE submitted_at IS NULL
  }),
);

// Deterministic answer cache. SHA-256 hash of
// (questionId + normalized answer + rubricVersion + modelVersion) → previously
// computed grading payload. Lets "same answer same grade" hold even across
// resubmissions, and short-circuits OpenAI for re-grades.
export const gradingCache = pgTable(
  'grading_cache',
  {
    key: text('key').primaryKey(),
    questionId: uuid('question_id')
      .references(() => questions.id, { onDelete: 'cascade' })
      .notNull(),
    rubricVersion: integer('rubric_version').notNull(),
    modelVersion: text('model_version').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: ts('created_at').defaultNow().notNull(),
  },
  (table) => ({
    questionIdx: index('grading_cache_question_idx').on(table.questionId),
  }),
);

// Stripe webhook events — used for idempotency. Recording the event id with a
// unique constraint guarantees we only act on each Stripe event once, even if
// Stripe retries delivery.
export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').unique().notNull(),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull(),
  receivedAt: ts('received_at').defaultNow().notNull(),
  processedAt: ts('processed_at'),
});

// Audit log of administrative + sensitive actions. Append-only; admins should
// never be able to mutate or delete past entries.
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    actorClerkId: text('actor_clerk_id'),
    action: text('action').notNull(), // e.g. 'admin.user.delete'
    targetType: text('target_type'), // e.g. 'user' | 'quiz' | 'course'
    targetId: text('target_id'),
    metadata: jsonb('metadata'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: ts('created_at').defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index('audit_log_created_idx').on(table.createdAt),
    actorIdx: index('audit_log_actor_idx').on(table.actorUserId),
  }),
);

/**
 * Personal access tokens for the professor API / MCP server.
 *
 * Only a SHA-256 hash of the secret is stored; the plaintext (`sol_pat_…`) is
 * shown exactly once at mint time. `scopes` gates which tool families a token
 * may call (see `lib/professorApiTokens.ts`). Revocation is a tombstone so the
 * audit trail keeps the row.
 */
export const professorApiTokens = pgTable(
  'professor_api_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    tokenHash: text('token_hash').unique().notNull(),
    // First characters of the plaintext token, for display ("sol_pat_ab12…").
    prefix: text('prefix').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    lastUsedAt: ts('last_used_at'),
    expiresAt: ts('expires_at'),
    revokedAt: ts('revoked_at'),
    createdAt: ts('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('professor_api_tokens_user_idx').on(table.userId),
  }),
);

// Socratic discussion chatbots — professor-authored (or seeded templates).
export const chatbots = pgTable(
  'chatbots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable for system templates (`isTemplate = true`) that any professor
    // can duplicate into an owned copy before assigning.
    professorId: uuid('professor_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    title: text('title').notNull(),
    description: text('description'),
    personaName: text('persona_name').notNull().default('Professor Emma'),
    instructions: text('instructions').notNull(),
    systemPrompt: text('system_prompt').notNull(),
    relatedQuizId: uuid('related_quiz_id').references(() => quizzes.id, {
      onDelete: 'set null',
    }),
    isTemplate: boolean('is_template').default(false).notNull(),
    model: text('model').notNull().default('gpt-4.1-mini'),
    isActive: boolean('is_active').default(true).notNull(),
    deletedAt: ts('deleted_at'),
    createdAt: ts('created_at').defaultNow().notNull(),
    updatedAt: ts('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    professorIdx: index('chatbots_professor_idx').on(table.professorId),
    relatedQuizIdx: index('chatbots_related_quiz_idx').on(table.relatedQuizId),
  }),
);

export const chatbotSections = pgTable(
  'chatbot_sections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatbotId: uuid('chatbot_id')
      .references(() => chatbots.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(),
    assignedBy: uuid('assigned_by')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    assignedAt: ts('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    chatbotSectionUnique: uniqueIndex('chatbot_sections_unique').on(
      table.chatbotId,
      table.sectionId,
    ),
    sectionIdx: index('chatbot_sections_section_idx').on(table.sectionId),
  }),
);

export const chatbotAssignments = pgTable(
  'chatbot_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    chatbotId: uuid('chatbot_id')
      .references(() => chatbots.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    isCompleted: boolean('is_completed').default(false).notNull(),
    assignedAt: ts('assigned_at').defaultNow().notNull(),
    completedAt: ts('completed_at'),
  },
  (table) => ({
    chatbotStudentUnique: uniqueIndex('chatbot_assignments_unique').on(
      table.chatbotId,
      table.studentId,
    ),
    studentIdx: index('chatbot_assignments_student_idx').on(table.studentId),
  }),
);

export type ChatbotMessage = {
  role: 'user' | 'assistant';
  content: string;
  at: string;
};

export const chatbotSessions = pgTable(
  'chatbot_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .references(() => chatbotAssignments.id, { onDelete: 'cascade' })
      .notNull(),
    studentId: uuid('student_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    chatbotId: uuid('chatbot_id')
      .references(() => chatbots.id, { onDelete: 'cascade' })
      .notNull(),
    sectionId: uuid('section_id')
      .references(() => sections.id, { onDelete: 'cascade' })
      .notNull(),
    messages: jsonb('messages').$type<ChatbotMessage[]>().notNull().default([]),
    status: text('status', {
      enum: ['in_progress', 'completed'],
    })
      .default('in_progress')
      .notNull(),
    startedAt: ts('started_at').defaultNow().notNull(),
    completedAt: ts('completed_at'),
  },
  (table) => ({
    assignmentIdx: index('chatbot_sessions_assignment_idx').on(table.assignmentId),
    studentIdx: index('chatbot_sessions_student_idx').on(table.studentId),
    chatbotIdx: index('chatbot_sessions_chatbot_idx').on(table.chatbotId),
    sectionIdx: index('chatbot_sessions_section_idx').on(table.sectionId),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  professorSections: many(professorSections),
  studentSections: many(studentSections),
  assignments: many(assignments),
  attempts: many(attempts),
  quizAssignments: many(quizSections), // quizzes assigned by this user
  quizzes: many(quizzes), // quizzes created by this user
  chatbots: many(chatbots),
  chatbotAssignments: many(chatbotAssignments),
  chatbotSessions: many(chatbotSessions),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  course: one(courses, {
    fields: [sections.courseId],
    references: [courses.id],
  }),
  professorSections: many(professorSections),
  studentSections: many(studentSections),
  quizSections: many(quizSections),
  chatbotSections: many(chatbotSections),
  attempts: many(attempts),
  chatbotSessions: many(chatbotSessions),
}));

export const professorSectionsRelations = relations(professorSections, ({ one }) => ({
  professor: one(users, {
    fields: [professorSections.professorId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [professorSections.sectionId],
    references: [sections.id],
  }),
}));

export const studentSectionsRelations = relations(studentSections, ({ one }) => ({
  student: one(users, {
    fields: [studentSections.studentId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [studentSections.sectionId],
    references: [sections.id],
  }),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  professor: one(users, {
    fields: [quizzes.professorId],
    references: [users.id],
  }),
  questions: many(questions),
  assignments: many(assignments),
  attempts: many(attempts),
  sectionAssignments: many(quizSections), // sections this quiz is assigned to
  relatedChatbots: many(chatbots),
}));

export const quizSectionsRelations = relations(quizSections, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [quizSections.quizId],
    references: [quizzes.id],
  }),
  section: one(sections, {
    fields: [quizSections.sectionId],
    references: [sections.id],
  }),
  assignedBy: one(users, {
    fields: [quizSections.assignedBy],
    references: [users.id],
  }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [questions.quizId],
    references: [quizzes.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [assignments.quizId],
    references: [quizzes.id],
  }),
  student: one(users, {
    fields: [assignments.studentId],
    references: [users.id],
  }),
  attempts: many(attempts),
}));

export const attemptsRelations = relations(attempts, ({ one }) => ({
  assignment: one(assignments, {
    fields: [attempts.assignmentId],
    references: [assignments.id],
  }),
  student: one(users, {
    fields: [attempts.studentId],
    references: [users.id],
  }),
  quiz: one(quizzes, {
    fields: [attempts.quizId],
    references: [quizzes.id],
  }),
  section: one(sections, {
    fields: [attempts.sectionId],
    references: [sections.id],
  }),
}));

export const chatbotsRelations = relations(chatbots, ({ one, many }) => ({
  professor: one(users, {
    fields: [chatbots.professorId],
    references: [users.id],
  }),
  relatedQuiz: one(quizzes, {
    fields: [chatbots.relatedQuizId],
    references: [quizzes.id],
  }),
  sectionAssignments: many(chatbotSections),
  assignments: many(chatbotAssignments),
  sessions: many(chatbotSessions),
}));

export const chatbotSectionsRelations = relations(chatbotSections, ({ one }) => ({
  chatbot: one(chatbots, {
    fields: [chatbotSections.chatbotId],
    references: [chatbots.id],
  }),
  section: one(sections, {
    fields: [chatbotSections.sectionId],
    references: [sections.id],
  }),
  assignedBy: one(users, {
    fields: [chatbotSections.assignedBy],
    references: [users.id],
  }),
}));

export const chatbotAssignmentsRelations = relations(
  chatbotAssignments,
  ({ one, many }) => ({
    chatbot: one(chatbots, {
      fields: [chatbotAssignments.chatbotId],
      references: [chatbots.id],
    }),
    student: one(users, {
      fields: [chatbotAssignments.studentId],
      references: [users.id],
    }),
    sessions: many(chatbotSessions),
  }),
);

export const chatbotSessionsRelations = relations(chatbotSessions, ({ one }) => ({
  assignment: one(chatbotAssignments, {
    fields: [chatbotSessions.assignmentId],
    references: [chatbotAssignments.id],
  }),
  student: one(users, {
    fields: [chatbotSessions.studentId],
    references: [users.id],
  }),
  chatbot: one(chatbots, {
    fields: [chatbotSessions.chatbotId],
    references: [chatbots.id],
  }),
  section: one(sections, {
    fields: [chatbotSessions.sectionId],
    references: [sections.id],
  }),
}));
