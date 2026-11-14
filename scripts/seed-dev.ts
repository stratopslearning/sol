/**
 * Synthetic seed for sol-knowledge-dev (never production).
 *
 * Creates two tenants: a department workspace and a personal (creator) workspace,
 * with owners, instructors, a TA-like instructor, students, a course with two
 * sections, a quiz + rubric, attempts, a chatbot session, and a knowledge doc.
 *
 *   I_CONFIRM_DEV_DB=1 npm run db:seed-dev
 */
import './lib/bootstrapDevDb';

import { eq } from 'drizzle-orm';
import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';

import * as schema from '../app/db/schema';

if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
}

const SEED_TAG = 'seed-dev';

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;

async function upsertUser(
  db: SeedDb,
  data: {
    clerkId: string;
    email: string;
    platformStaff?: boolean;
    firstName: string;
    lastName: string;
  },
) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, data.email),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(schema.users)
    .values({
      clerkId: data.clerkId,
      email: data.email,
      platformStaff: data.platformStaff ?? false,
      paid: true,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    .returning();
  return row;
}

async function upsertWorkspace(
  db: SeedDb,
  data: {
    slug: string;
    name: string;
    type: 'creator' | 'department';
  },
) {
  const existing = await db.query.workspaces.findFirst({
    where: eq(schema.workspaces.slug, data.slug),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(schema.workspaces)
    .values({
      slug: data.slug,
      name: data.name,
      type: data.type,
      status: 'active',
      settings: { seed: SEED_TAG },
    })
    .returning();
  return row;
}

async function ensureMembership(
  db: SeedDb,
  workspaceId: string,
  userId: string,
  _legacyRoleIgnored?: string,
) {
  // Seat-only: writers always store role=member (authority is role_bindings).
  await db
    .insert(schema.workspaceMemberships)
    .values({ workspaceId, userId, role: 'member', status: 'active' })
    .onConflictDoNothing();
}

async function ensureOffering(
  db: SeedDb,
  courseId: string,
  tenantId: string,
) {
  const existing = await db.query.courseOfferings.findFirst({
    where: eq(schema.courseOfferings.courseId, courseId),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(schema.courseOfferings)
    .values({
      courseId,
      tenantId,
      termLabel: 'default',
      status: 'active',
    })
    .returning();
  return row!;
}

async function ensureLicense(
  db: SeedDb,
  workspaceId: string,
  plan: 'creator' | 'department',
) {
  const existing = await db.query.workspaceLicenses.findFirst({
    where: eq(schema.workspaceLicenses.workspaceId, workspaceId),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(schema.workspaceLicenses)
    .values({
      workspaceId,
      plan,
      seatCap: plan === 'creator' ? 50 : 500,
      aiUnitCap: plan === 'creator' ? 200 : 5000,
      status: 'active',
      billingProvider: 'manual',
    })
    .returning();
  return row;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');

  const pool = new Pool({ connectionString: url });
  const db: SeedDb = drizzle(pool, { schema });

  console.log(`[${SEED_TAG}] seeding synthetic tenants…`);

  const deptOwner = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_dept_owner`,
    email: 'dept-owner@seed.sol.local',
    firstName: 'Dana',
    lastName: 'Owner',
  });
  const instructor = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_instructor`,
    email: 'instructor@seed.sol.local',
    firstName: 'Ira',
    lastName: 'Instructor',
  });
  const ta = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_ta`,
    email: 'ta@seed.sol.local',
    firstName: 'Taylor',
    lastName: 'Assistant',
  });
  const personalOwner = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_personal`,
    email: 'personal@seed.sol.local',
    firstName: 'Pat',
    lastName: 'Personal',
  });
  const studentA = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_student_a`,
    email: 'student-a@seed.sol.local',
    firstName: 'Sam',
    lastName: 'Alpha',
  });
  const studentB = await upsertUser(db, {
    clerkId: `seed_${SEED_TAG}_student_b`,
    email: 'student-b@seed.sol.local',
    firstName: 'Sara',
    lastName: 'Beta',
  });

  const dept = await upsertWorkspace(db, {
    slug: slug(`${SEED_TAG}-cs-dept`),
    name: 'Seed CS Department',
    type: 'department',
  });
  const personal = await upsertWorkspace(db, {
    slug: slug(`${SEED_TAG}-personal`),
    name: 'Seed Personal Workspace',
    type: 'creator',
  });

  await ensureLicense(db, dept.id, 'department');
  await ensureLicense(db, personal.id, 'creator');

  await ensureMembership(db, dept.id, deptOwner.id, 'owner');
  await ensureMembership(db, dept.id, instructor.id, 'instructor');
  await ensureMembership(db, dept.id, ta.id, 'instructor');
  await ensureMembership(db, dept.id, studentA.id, 'learner');
  await ensureMembership(db, dept.id, studentB.id, 'learner');
  await ensureMembership(db, personal.id, personalOwner.id, 'owner');
  await ensureMembership(db, personal.id, studentB.id, 'learner');

  let course = await db.query.courses.findFirst({
    where: eq(schema.courses.title, 'Seed CS 101'),
  });
  if (!course) {
    const [created] = await db
      .insert(schema.courses)
      .values({
        workspaceId: dept.id,
        tenantId: dept.id,
        title: 'Seed CS 101',
        description: 'Synthetic intro course for local/dev',
      })
      .returning();
    course = created;
  }

  const offering = await ensureOffering(db, course.id, dept.id);

  async function ensureSection(name: string, codes: { prof: string; stud: string }) {
    const existing = await db.query.sections.findFirst({
      where: eq(schema.sections.studentEnrollmentCode, codes.stud),
    });
    if (existing) return existing;
    const [row] = await db
      .insert(schema.sections)
      .values({
        courseId: course!.id,
        workspaceId: dept.id,
        tenantId: dept.id,
        offeringId: offering.id,
        name,
        professorEnrollmentCode: codes.prof,
        studentEnrollmentCode: codes.stud,
      })
      .returning();
    return row;
  }

  const sectionA = await ensureSection('Seed Section A', {
    prof: 'SEEDPA',
    stud: 'SEEDSA',
  });
  const sectionB = await ensureSection('Seed Section B', {
    prof: 'SEEDPB',
    stud: 'SEEDSB',
  });

  await db
    .insert(schema.professorSections)
    .values([
      {
        professorId: instructor.id,
        sectionId: sectionA.id,
        tenantId: dept.id,
        offeringId: offering.id,
      },
      {
        professorId: instructor.id,
        sectionId: sectionB.id,
        tenantId: dept.id,
        offeringId: offering.id,
      },
      {
        professorId: ta.id,
        sectionId: sectionA.id,
        tenantId: dept.id,
        offeringId: offering.id,
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(schema.studentSections)
    .values([
      {
        studentId: studentA.id,
        sectionId: sectionA.id,
        tenantId: dept.id,
        offeringId: offering.id,
      },
      {
        studentId: studentB.id,
        sectionId: sectionB.id,
        tenantId: dept.id,
        offeringId: offering.id,
      },
    ])
    .onConflictDoNothing();

  let quiz = await db.query.quizzes.findFirst({
    where: eq(schema.quizzes.title, 'Seed Quiz 1'),
  });
  if (!quiz) {
    const [created] = await db
      .insert(schema.quizzes)
      .values({
        title: 'Seed Quiz 1',
        description: JSON.stringify({ seed: SEED_TAG }),
        professorId: instructor.id,
        tenantId: dept.id,
        offeringId: offering.id,
        maxAttempts: 3,
        passingScore: 60,
        isActive: true,
      })
      .returning();
    quiz = created;
  }

  await db
    .insert(schema.quizSections)
    .values([
      {
        quizId: quiz.id,
        sectionId: sectionA.id,
        assignedBy: instructor.id,
        tenantId: dept.id,
      },
      {
        quizId: quiz.id,
        sectionId: sectionB.id,
        assignedBy: instructor.id,
        tenantId: dept.id,
      },
    ])
    .onConflictDoNothing();

  let question = await db.query.questions.findFirst({
    where: eq(schema.questions.quizId, quiz.id),
  });
  if (!question) {
    const [created] = await db
      .insert(schema.questions)
      .values({
        quizId: quiz.id,
        tenantId: dept.id,
        type: 'SHORT_ANSWER',
        question: 'What is a variable?',
        correctAnswer: 'A named storage location for a value',
        points: 10,
        order: 0,
        rubric: [
          {
            id: 'c1',
            description: 'Names storage for a value',
            weight: 1,
          },
        ],
        rubricVersion: 1,
        conceptTags: ['variables'],
      })
      .returning();
    question = created;
  }

  for (const student of [studentA, studentB]) {
    await db
      .insert(schema.assignments)
      .values({ quizId: quiz.id, studentId: student.id, tenantId: dept.id })
      .onConflictDoNothing();
  }

  const assignmentA = await db.query.assignments.findFirst({
    where: eq(schema.assignments.studentId, studentA.id),
  });
  if (assignmentA) {
    const existingAttempt = await db.query.attempts.findFirst({
      where: eq(schema.attempts.assignmentId, assignmentA.id),
    });
    if (!existingAttempt) {
      await db.insert(schema.attempts).values({
        assignmentId: assignmentA.id,
        studentId: studentA.id,
        quizId: quiz.id,
        sectionId: sectionA.id,
        tenantId: dept.id,
        answers: { [question.id]: 'A named place to store data' },
        score: 8,
        maxScore: 10,
        percentage: 80,
        passed: true,
        gradingStatus: 'complete',
        submittedAt: new Date(),
        gptFeedback: {
          [question.id]: {
            status: 'graded',
            score: 8,
            maxScore: 10,
            modelVersion: 'seed',
            rubricVersion: 1,
          },
        },
      });
    }
  }

  let chatbot = await db.query.chatbots.findFirst({
    where: eq(schema.chatbots.title, 'Seed Tutor'),
  });
  if (!chatbot) {
    const [created] = await db
      .insert(schema.chatbots)
      .values({
        title: 'Seed Tutor',
        professorId: instructor.id,
        tenantId: dept.id,
        offeringId: offering.id,
        instructions: 'Help with Seed CS 101. Cite materials.',
        systemPrompt: 'You are a course tutor for Seed CS 101.',
        isActive: true,
      })
      .returning();
    chatbot = created;
  }

  await db
    .insert(schema.chatbotSections)
    .values({
      chatbotId: chatbot.id,
      sectionId: sectionA.id,
      assignedBy: instructor.id,
      tenantId: dept.id,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.chatbotAssignments)
    .values({
      chatbotId: chatbot.id,
      studentId: studentA.id,
      tenantId: dept.id,
    })
    .onConflictDoNothing();

  const chatbotAssignment = await db.query.chatbotAssignments.findFirst({
    where: eq(schema.chatbotAssignments.studentId, studentA.id),
  });
  const existingSession = await db.query.chatbotSessions.findFirst({
    where: eq(schema.chatbotSessions.chatbotId, chatbot.id),
  });
  if (!existingSession && chatbotAssignment) {
    await db.insert(schema.chatbotSessions).values({
      assignmentId: chatbotAssignment.id,
      chatbotId: chatbot.id,
      studentId: studentA.id,
      sectionId: sectionA.id,
      tenantId: dept.id,
      messages: [
        { role: 'user', content: 'What is a variable?', at: new Date().toISOString() },
        {
          role: 'assistant',
          content: 'A variable stores a value under a name. [seed]',
          at: new Date().toISOString(),
        },
      ],
    });
  }

  const existingDoc = await db.query.knowledgeDocuments.findFirst({
    where: eq(schema.knowledgeDocuments.title, 'Seed Syllabus'),
  });
  if (!existingDoc) {
    const [doc] = await db
      .insert(schema.knowledgeDocuments)
      .values({
        workspaceId: dept.id,
        tenantId: dept.id,
        title: 'Seed Syllabus',
        sourceKind: 'UPLOAD',
        status: 'READY',
        visibility: 'workspace',
        createdByUserId: instructor.id,
      })
      .returning();
    await db.insert(schema.courseKnowledgeLinks).values({
      courseId: course.id,
      documentId: doc.id,
      tenantId: dept.id,
      linkedByUserId: instructor.id,
      pinnedVersionId: null,
    } as typeof schema.courseKnowledgeLinks.$inferInsert);
  }

  console.log(`[${SEED_TAG}] done`);
  console.log(`  department workspace: ${dept.slug} (${dept.id})`);
  console.log(`  personal workspace:   ${personal.slug} (${personal.id})`);
  console.log(`  course: Seed CS 101 (${course.id})`);
  console.log(`  sections: ${sectionA.name}, ${sectionB.name}`);
  console.log(`  enroll codes (student): SEEDSA / SEEDSB`);

  await pool.end();
}

main().catch((err) => {
  console.error(`[${SEED_TAG}] failed:`, err);
  process.exit(1);
});
