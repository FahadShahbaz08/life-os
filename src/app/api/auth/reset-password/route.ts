import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findUserByResetToken, updatePassword } from '@/lib/users';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    const token = body.token?.trim();
    const password = body.password;

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await updatePassword(user._id.toString(), passwordHash);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ valid: false });
  }

  const user = await findUserByResetToken(token);
  return NextResponse.json({ valid: !!user });
}
