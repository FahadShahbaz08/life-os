import type { Task } from '@/types';
import { refreshGoogleAccessToken } from '@/lib/google-oauth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

function getTimezone(): string {
  return process.env.CALENDAR_TIMEZONE ?? 'Asia/Karachi';
}

function addMinutesToTime(date: string, time: string, minutes: number): { date: string; time: string } {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  d.setMinutes(d.getMinutes() + minutes);
  return {
    date: d.toISOString().split('T')[0],
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function taskToCalendarEvent(task: Task) {
  const tz = getTimezone();
  const description = [
    task.description,
    task.progressNotes ? `Notes: ${task.progressNotes}` : '',
    `Life OS task ID: ${task.id}`,
  ].filter(Boolean).join('\n\n');

  if (!task.dueDate) return null;

  if (task.dueTime) {
    const end = addMinutesToTime(task.dueDate, task.dueTime, 30);
    return {
      summary: task.title,
      description,
      start: { dateTime: `${task.dueDate}T${task.dueTime}:00`, timeZone: tz },
      end: { dateTime: `${end.date}T${end.time}:00`, timeZone: tz },
    };
  }

  return {
    summary: task.title,
    description,
    start: { date: task.dueDate },
    end: { date: addDays(task.dueDate, 1) },
  };
}

async function getAccessToken(refreshToken: string): Promise<string> {
  return refreshGoogleAccessToken(refreshToken);
}

async function calendarRequest(
  refreshToken: string,
  method: string,
  path: string,
  body?: unknown
): Promise<Response> {
  const accessToken = await getAccessToken(refreshToken);
  return fetch(`${CALENDAR_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function createCalendarEvent(refreshToken: string, task: Task): Promise<string | null> {
  const event = taskToCalendarEvent(task);
  if (!event) return null;

  const res = await calendarRequest(refreshToken, 'POST', '', event);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create calendar event: ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export async function updateCalendarEvent(refreshToken: string, task: Task): Promise<string | null> {
  if (!task.googleEventId) {
    return createCalendarEvent(refreshToken, task);
  }

  const event = taskToCalendarEvent(task);
  if (!event) {
    await deleteCalendarEvent(refreshToken, task.googleEventId);
    return null;
  }

  const res = await calendarRequest(refreshToken, 'PATCH', `/${encodeURIComponent(task.googleEventId)}`, event);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update calendar event: ${err}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}

export async function deleteCalendarEvent(refreshToken: string, eventId: string): Promise<void> {
  const res = await calendarRequest(refreshToken, 'DELETE', `/${encodeURIComponent(eventId)}`);
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Failed to delete calendar event: ${err}`);
  }
}

export function shouldSyncTaskToCalendar(task: Task, syncEnabled: boolean): boolean {
  if (!syncEnabled) return false;
  if (!task.dueDate) return false;
  if (task.status === 'completed' || task.status === 'archived') return false;
  return true;
}

export function shouldRemoveFromCalendar(task: Task): boolean {
  return task.status === 'completed' || task.status === 'archived' || !task.dueDate;
}
