import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/getOrCreateUser';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getOrCreateUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 