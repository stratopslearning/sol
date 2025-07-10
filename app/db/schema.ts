import { pgTable, text, timestamp, boolean, integer, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - syncs with Clerk
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(), // Clerk's userId
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: text('role', { enum: ['STUDENT', 'PROFESSOR', 'ADMIN'] }).default('STUDENT').notNull(),
  paid: boolean('paid').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Courses table
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  professorId: uuid('professor_id').references(() => users.id).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Quizzes table
export const quizzes = pgTable('quizzes', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  courseId: uuid('course_id').references(() => courses.id), // Optional - can be null for global quizzes
  professorId: uuid('professor_id').references(() => users.id).notNull(), // Direct link to professor
  maxAttempts: integer('max_attempts').default(1).notNull(), // Maximum attempts allowed
  timeLimit: integer('time_limit'), // in minutes
  startDate: timestamp('start_date'), // Quiz start date
  endDate: timestamp('end_date'), // Quiz end date
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').references(() => quizzes.id).notNull(),
  type: text('type', { enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] }).notNull(),
  question: text('question').notNull(),
  options: jsonb('options'), // For MCQ: ["option1", "option2", ...]
  correctAnswer: text('correct_answer'), // For MCQ/TF: "option1" or "true"
  points: integer('points').default(1).notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Assignments table - links students to quizzes
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  quizId: uuid('quiz_id').references(() => quizzes.id).notNull(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  dueDate: timestamp('due_date'),
  isCompleted: boolean('is_completed').default(false).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Attempts table - student quiz submissions
export const attempts = pgTable('attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').references(() => assignments.id).notNull(),
  studentId: uuid('student_id').references(() => users.id).notNull(),
  quizId: uuid('quiz_id').references(() => quizzes.id).notNull(),
  answers: jsonb('answers').notNull(), // { questionId: answer }
  score: integer('score'), // total points earned
  maxScore: integer('max_score').notNull(), // total possible points
  percentage: integer('percentage'), // score as percentage
  passed: boolean('passed'), // based on passing score
  gptFeedback: jsonb('gpt_feedback'), // AI feedback for short answers
  startedAt: timestamp('started_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  assignments: many(assignments),
  attempts: many(attempts),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  professor: one(users, {
    fields: [courses.professorId],
    references: [users.id],
  }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  course: one(courses, {
    fields: [quizzes.courseId],
    references: [courses.id],
  }),
  professor: one(users, {
    fields: [quizzes.professorId],
    references: [users.id],
  }),
  questions: many(questions),
  assignments: many(assignments),
  attempts: many(attempts),
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
})); 