import { createHmac, timingSafeEqual } from 'crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return secret;
}

function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

export function getCalendarRedirectUri(origin: string): string {
  return `${origin}/api/calendar/callback`;
}

export function signOAuthState(userId: string): string {
  const sig = createHmac('sha256', getAuthSecret()).update(userId).digest('hex');
  return Buffer.from(`${userId}:${sig}`).toString('base64url');
}

export function verifyOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString();
    const colon = decoded.lastIndexOf(':');
    if (colon === -1) return null;
    const userId = decoded.slice(0, colon);
    const sig = decoded.slice(colon + 1);
    const expected = createHmac('sha256', getAuthSecret()).update(userId).digest('hex');
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return userId;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(userId: string, origin: string): string {
  const { clientId } = getGoogleCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCalendarRedirectUri(origin),
    response_type: 'code',
    scope: CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: signOAuthState(userId),
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, origin: string): Promise<{ refreshToken: string | null; accessToken: string }> {
  const { clientId, clientSecret } = getGoogleCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCalendarRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const data = await res.json() as { access_token: string; refresh_token?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getGoogleCredentials();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token refresh failed: ${err}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}
