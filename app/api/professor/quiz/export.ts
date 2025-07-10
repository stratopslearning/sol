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

    // Parse filters from query params
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get('quizId');
    const quizTitle = searchParams.get('quizTitle');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Get quizzes for this professor
    let quizFilter: any = eq(quizzes.professorId, professor.id);
    if (quizId) quizFilter = and(quizFilter, eq(quizzes.id, quizId));
    if (quizTitle) quizFilter = and(quizFilter, eq(quizzes.title, quizTitle));
    const quizList = await db.query.quizzes.findMany({ where: quizFilter });
    const quizIds = quizList.map(q => q.id);
    if (quizIds.length === 0) {
      return NextResponse.json({ error: 'No quizzes found' }, { status: 404 });
    }

    // Get attempts for these quizzes
    let attemptFilter: any = inArray(attempts.quizId, quizIds);
    if (dateFrom) attemptFilter = and(attemptFilter, gte(attempts.submittedAt, new Date(dateFrom)));
    if (dateTo) attemptFilter = and(attemptFilter, lte(attempts.submittedAt, new Date(dateTo)));
    const attemptList = await db.query.attempts.findMany({ where: attemptFilter });
    if (attemptList.length === 0) {
      return NextResponse.json({ error: 'No attempts found' }, { status: 404 });
    }

    // Get all students for these attempts
    const studentIds = Array.from(new Set(attemptList.map(a => a.studentId)));
    const studentList = await db.query.users.findMany({ where: inArray(users.id, studentIds) });
    const studentMap = Object.fromEntries(studentList.map(s => [s.id, s]));
    const quizMap = Object.fromEntries(quizList.map(q => [q.id, q]));

    // Count attempts per student per quiz
    const attemptCounts: Record<string, number> = {};
    attemptList.forEach(a => {
      const key = `${a.studentId}_${a.quizId}`;
      attemptCounts[key] = (attemptCounts[key] || 0) + 1;
    });

    // Prepare CSV data
    const csvRows = attemptList.map(a => {
      const student = studentMap[a.studentId];
      const quiz = quizMap[a.quizId];
      return {
        'Student Name': student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : 'Unknown',
        'Student Email': student?.email || 'Unknown',
        'Quiz Name': quiz?.title || 'Unknown',
        'Attempt Date': a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '',
        'Score': `${a.score} / ${a.maxScore}`,
        'Percentage': a.percentage != null ? `${a.percentage}%` : '',
        'Number of Attempts': attemptCounts[`${a.studentId}_${a.quizId}`] || 1,
      };
    });

    const csv = parse(csvRows);
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