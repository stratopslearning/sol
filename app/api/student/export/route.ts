import { NextResponse } from 'next/server';

import { userCanAccessLearningArea } from '@/lib/authz';
import { getOrCreateUser } from '@/lib/getOrCreateUser';
import { exportStudentData } from '@/lib/student/exportData';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await userCanAccessLearningArea(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await exportStudentData(user.id);
  return NextResponse.json(payload);
}
