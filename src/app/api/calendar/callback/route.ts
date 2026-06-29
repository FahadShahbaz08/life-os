import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, verifyOAuthState } from '@/lib/google-oauth';
import { getGoogleRefreshToken, saveGoogleRefreshToken } from '@/lib/users';

export async function GET(request: Request) {
  const session = await auth();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const origin = url.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/?calendar=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/?calendar=error`);
  }

  const userIdFromState = verifyOAuthState(state);
  if (!userIdFromState || !session?.user?.id || userIdFromState !== session.user.id) {
    return NextResponse.redirect(`${origin}/?calendar=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, origin);
    const existing = await getGoogleRefreshToken(session.user.id);
    const refreshToken = tokens.refreshToken ?? existing;

    if (!refreshToken) {
      return NextResponse.redirect(`${origin}/?calendar=no_refresh_token`);
    }

    await saveGoogleRefreshToken(session.user.id, refreshToken);
    return NextResponse.redirect(`${origin}/?calendar=connected`);
  } catch (err) {
    console.error('Calendar callback error:', err);
    return NextResponse.redirect(`${origin}/?calendar=error`);
  }
}
