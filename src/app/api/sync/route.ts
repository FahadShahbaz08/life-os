import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserData, saveUserData } from '@/lib/users';
import { createEmptyState, normalizeState } from '@/lib/storage';
import { AppState } from '@/types';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getUserData(session.user.id);

    if (!data) {
      const empty = createEmptyState();
      if (session.user.name) empty.settings.userName = session.user.name;
      await saveUserData(session.user.id, empty);
      return NextResponse.json(empty);
    }

    return NextResponse.json(normalizeState(data));
  } catch (err) {
    console.error('Sync GET error:', err);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as Partial<AppState>;
    const normalized = normalizeState(body);
    await saveUserData(session.user.id, normalized);

    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Sync PUT error:', err);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
