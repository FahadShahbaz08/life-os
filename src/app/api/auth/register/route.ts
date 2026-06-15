import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '@/lib/users';
import { createEmptyState } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim() ?? '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emptyState = createEmptyState();
    if (name) emptyState.settings.userName = name;

    await createUser({ email, passwordHash, name, data: emptyState });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
