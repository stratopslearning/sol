import { NextResponse } from 'next/server';

import { getDashboardAreas } from '@/lib/authz/gates';
import { getOrCreateUser, toPublicUserDto } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getOrCreateUser();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...toPublicUserDto(user),
        platformStaff: user.platformStaff,
        areas: await getDashboardAreas(user),
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
