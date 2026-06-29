import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getGoogleRefreshToken } from '@/lib/users';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const refreshToken = await getGoogleRefreshToken(session.user.id);
    return NextResponse.json({ connected: !!refreshToken });
  } catch (err) {
    console.error('Calendar status error:', err);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
