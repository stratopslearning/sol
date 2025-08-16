import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, attempts, users, professorSections, quizSections } from '@/app/db/schema';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { parse } from 'json2csv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get professor user
    const professor = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
    if (!professor || professor.role !== 'PROFESSOR') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all section IDs the professor is enrolled in
    const professorSectionEnrollments = await db.query.professorSections.findMany({
      where: eq(professorSections.professorId, professor.id),
    });
    const sectionIds = professorSectionEnrollments.map(e => e.sectionId);
    if (sectionIds.length === 0) {
      return NextResponse.json({ error: 'No section access' }, { status: 403 });
    }

    // Get all quiz IDs assigned to these sections
    const quizSectionAssignments = await db.query.quizSections.findMany({
      where: inArray(quizSections.sectionId, sectionIds),
    });
    const allowedQuizIds = quizSectionAssignments.map(qs => qs.quizId);
    if (allowedQuizIds.length === 0) {
      return NextResponse.json({ error: 'No quiz access' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where conditions
    let whereConditions = [inArray(attempts.quizId, allowedQuizIds)];
    if (quizId) {
      if (!allowedQuizIds.includes(quizId)) {
        return NextResponse.json({ error: 'Access denied for this quiz' }, { status: 403 });
      }
      whereConditions.push(eq(attempts.quizId, quizId));
    }
    if (dateFrom) {
      whereConditions.push(gte(attempts.submittedAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(attempts.submittedAt, new Date(dateTo + 'T23:59:59')));
    }

    // Fetch attempts with student and quiz data
    const results = await db
      .select({
        studentFirstName: users.firstName,
        studentLastName: users.lastName,
        studentEmail: users.email,
        quizTitle: quizzes.title,
        attemptDate: attempts.submittedAt,
        score: attempts.score,
        maxScore: attempts.maxScore,
        percentage: attempts.percentage,
        attemptId: attempts.id,
      })
      .from(attempts)
      .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
      .innerJoin(users, eq(attempts.studentId, users.id))
      .where(and(...whereConditions))
      .orderBy(attempts.submittedAt);

    // Calculate attempt counts per student per quiz
    const attemptCounts = new Map<string, number>();
    results.forEach(result => {
      const key = `${result.studentEmail}-${result.quizTitle}`;
      attemptCounts.set(key, (attemptCounts.get(key) || 0) + 1);
    });

    // Format data for CSV
    const csvData = results.map(result => {
      const key = `${result.studentEmail}-${result.quizTitle}`;
      const fullName = [result.studentFirstName, result.studentLastName].filter(Boolean).join(' ') || 'Unknown';
      return {
        'Student Name': fullName,
        'Student Email': result.studentEmail,
        'Quiz Name': result.quizTitle,
        'Attempt Date': result.attemptDate ? new Date(result.attemptDate).toLocaleString() : 'N/A',
        'Score': result.score,
        'Max Score': result.maxScore,
        'Attempt Number': attemptCounts.get(key) || 1,
      };
    });

    // Generate CSV
    const csv = parse(csvData, {
      fields: ['Student Name', 'Student Email', 'Quiz Name', 'Attempt Date', 'Score', 'Max Score', 'Attempt Number'],
    });

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="quiz_results.csv"',
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export results' }, { status: 500 });
  }
} 