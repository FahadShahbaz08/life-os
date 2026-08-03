import { NextResponse } from 'next/server';
import { generateResetToken, getResetExpiryDate, hashResetToken } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/email';
import { findUserByEmail, setPasswordReset } from '@/lib/users';

const GENERIC_MESSAGE = 'If an account exists for that email, we sent password reset instructions.';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (user) {
      const token = generateResetToken();
      const expires = getResetExpiryDate();
      await setPasswordReset(email, hashResetToken(token), expires);

      const origin = new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (err) {
        console.error('Failed to send reset email:', err);
        if (process.env.NODE_ENV !== 'development') {
          return NextResponse.json({ error: 'Could not send reset email. Try again later.' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
