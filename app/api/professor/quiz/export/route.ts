import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { quizzes, attempts, users } from '@/app/db/schema';
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build where conditions
    const whereConditions = [eq(attempts.quizId, quizzes.id), eq(quizzes.professorId, professor.id)];
    
    if (quizId) {
      whereConditions.push(eq(quizzes.id, quizId));
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
        studentName: users.firstName,
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
      return {
        'Student Name': `${result.studentName || 'Unknown'}`,
        'Student Email': result.studentEmail,
        'Quiz Name': result.quizTitle,
        'Attempt Date': result.attemptDate ? new Date(result.attemptDate).toLocaleString() : 'N/A',
        'Score': result.score,
        'Max Score': result.maxScore,
        'Percentage': `${result.percentage}%`,
        'Attempt Number': attemptCounts.get(key) || 1,
      };
    });

    // Generate CSV
    const csv = parse(csvData, {
      fields: ['Student Name', 'Student Email', 'Quiz Name', 'Attempt Date', 'Score', 'Max Score', 'Percentage', 'Attempt Number'],
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