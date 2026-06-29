import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { clearGoogleRefreshToken, getGoogleRefreshToken } from '@/lib/users';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await clearGoogleRefreshToken(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Calendar disconnect error:', err);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
