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
    // Partial index: fast lookup for the cron worker, which only ever cares
    // about attempts that still have pending grading work to do.
    gradingStatusIdx: index('attempts_grading_status_idx').on(
      table.gradingStatus,
    ),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  professorSections: many(professorSections),
  studentSections: many(studentSections),
  assignments: many(assignments),
  attempts: many(attempts),
  quizAssignments: many(quizSections), // quizzes assigned by this user
  quizzes: many(quizzes), // quizzes created by this user
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
  attempts: many(attempts),
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
