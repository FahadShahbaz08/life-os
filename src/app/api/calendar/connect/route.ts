import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { buildGoogleAuthUrl } from '@/lib/google-oauth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const url = buildGoogleAuthUrl(session.user.id, origin);
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('Calendar connect error:', err);
    return NextResponse.json({ error: 'Google Calendar is not configured' }, { status: 500 });
  }
}
