import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/app/db';
import { auditLog, users } from '@/app/db/schema';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  action: z.string().min(1).optional(),
  actorUserId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  try {
    const { userId: adminClerkId } = await auth();
    if (!adminClerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = await db.query.users.findFirst({
      where: eq(users.clerkId, adminClerkId),
    });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = querySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.errors },
        { status: 400 },
      );
    }
    const { action, actorUserId, from, to, limit, offset } = parsed.data;

    const conditions = [];
    if (action) conditions.push(eq(auditLog.action, action));
    if (actorUserId) conditions.push(eq(auditLog.actorUserId, actorUserId));
    if (from) conditions.push(gte(auditLog.createdAt, new Date(from)));
    if (to) conditions.push(lte(auditLog.createdAt, new Date(to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRow] = await Promise.all([
      db.query.auditLog.findMany({
        where,
        orderBy: [desc(auditLog.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(where),
    ]);

    return NextResponse.json({
      entries: rows,
      total: countRow[0]?.count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Audit log list failed:', error);
    return NextResponse.json({ error: 'Failed to load audit log' }, { status: 500 });
  }
}
