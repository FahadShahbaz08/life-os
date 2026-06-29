import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  shouldRemoveFromCalendar,
  shouldSyncTaskToCalendar,
  updateCalendarEvent,
} from '@/lib/google-calendar';
import { getGoogleRefreshToken, getUserData } from '@/lib/users';
import type { Task } from '@/types';

type SyncBody = {
  action: 'create' | 'update' | 'delete';
  task: Task;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as SyncBody;
    const { action, task } = body;

    if (!task?.id || !action) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const refreshToken = await getGoogleRefreshToken(session.user.id);
    if (!refreshToken) {
      return NextResponse.json({ skipped: true, reason: 'not_connected' });
    }

    const userData = await getUserData(session.user.id);
    const syncEnabled = userData?.settings.googleCalendarSyncEnabled ?? true;

    if (action === 'delete' || shouldRemoveFromCalendar(task)) {
      if (task.googleEventId) {
        await deleteCalendarEvent(refreshToken, task.googleEventId);
      }
      return NextResponse.json({ ok: true, googleEventId: null });
    }

    if (!shouldSyncTaskToCalendar(task, syncEnabled)) {
      if (task.googleEventId) {
        await deleteCalendarEvent(refreshToken, task.googleEventId);
        return NextResponse.json({ ok: true, googleEventId: null });
      }
      return NextResponse.json({ skipped: true, reason: 'no_due_date_or_disabled' });
    }

    let googleEventId: string | null = null;
    if (action === 'create') {
      googleEventId = await createCalendarEvent(refreshToken, task);
    } else {
      googleEventId = await updateCalendarEvent(refreshToken, task);
    }

    return NextResponse.json({ ok: true, googleEventId });
  } catch (err) {
    console.error('Calendar sync error:', err);
    return NextResponse.json({ error: 'Calendar sync failed' }, { status: 500 });
  }
}
