# Google Calendar Integration — Developer Setup

This guide explains how to configure Google Calendar sync for **Life OS**. When connected, tasks with a **due date** are automatically created, updated, or removed in the user's primary Google Calendar.

---

## Overview

| Component | Location |
|-----------|----------|
| OAuth helpers | `src/lib/google-oauth.ts` |
| Calendar API helpers | `src/lib/google-calendar.ts` |
| Connect (start OAuth) | `GET /api/calendar/connect` |
| OAuth callback | `GET /api/calendar/callback` |
| Sync task → calendar | `POST /api/calendar/sync` |
| Connection status | `GET /api/calendar/status` |
| Disconnect | `POST /api/calendar/disconnect` |
| Client sync hooks | `src/context/AppContext.tsx` |
| Sidebar UI | `src/components/settings/GoogleCalendarConnect.tsx` |

**Auth model:** Users log in with email/password (NextAuth credentials). Google OAuth is used **only** to link Calendar — it does not replace app login.

**Token storage:** Google refresh tokens are stored on the user document in MongoDB (`users.googleRefreshToken`). They are never sent to the client.

---

## Prerequisites

- Node.js **≥ 20**
- A running MongoDB instance (`MONGODB_URI`)
- NextAuth secret (`AUTH_SECRET`)
- A Google Cloud project with Calendar API enabled

---

## Step 1 — Google Cloud Project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. **Life OS**).
3. Select that project for all steps below.

---

## Step 2 — Enable Google Calendar API

1. Go to **APIs & Services** → **Library**.
2. Search for **Google Calendar API**.
3. Click **Enable**.

---

## Step 3 — OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**.
2. Choose **External** (unless you use Google Workspace internally).
3. Fill required fields:
   - **App name:** Life OS
   - **User support email:** your email
   - **Developer contact:** your email
4. Under **Scopes**, add:
   ```
   https://www.googleapis.com/auth/calendar.events
   ```
5. Under **Test users**, add every Google account that will connect during development (required while the app is in **Testing** mode).
6. Save.

> **Production:** Before public launch, submit the app for Google verification if you stay on External + sensitive scopes.

---

## Step 4 — OAuth Client Credentials

1. Go to **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. Name: e.g. `Life OS Web`.

### Authorized redirect URIs

Add the callback URL for each environment:

| Environment | Redirect URI |
|-------------|--------------|
| Local dev | `http://localhost:3000/api/calendar/callback` |
| Production | `https://your-domain.com/api/calendar/callback` |

5. Click **Create** and copy:
   - **Client ID**
   - **Client secret**

---

## Step 5 — Environment Variables

Copy `.env.example` to `.env.local` and set:

```env
# Required (existing)
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=your-secret-here

# Google Calendar (required for sync)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# Optional — timezone for timed/all-day events (default: Asia/Karachi)
CALENDAR_TIMEZONE=Asia/Karachi
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Restart the dev server after changing env vars:

```bash
npm run dev
```

---

## Step 6 — Connect Calendar in the App

1. Register / log in to Life OS.
2. Open the **sidebar footer** → **Google Calendar**.
3. Click **Connect**.
4. Sign in with Google and approve calendar access.
5. Confirm **Connected** appears in the sidebar.

The OAuth callback redirects to `/?calendar=connected` on success.

---

## How Sync Works

### When events are created

A calendar event is created when **all** of these are true:

- User has connected Google Calendar (refresh token in DB).
- `settings.googleCalendarSyncEnabled` is `true` (default).
- Task has a `dueDate`.
- Task status is not `completed` or `archived`.

### Event mapping

| Task field | Google Calendar field |
|------------|------------------------|
| `title` | `summary` |
| `description`, `progressNotes` | `description` |
| `dueDate` only | All-day event (`start.date` / `end.date`) |
| `dueDate` + `dueTime` | Timed event, 30-minute duration |
| `id` | Included in description for debugging |

### When events are updated or removed

| App action | Calendar action |
|------------|-----------------|
| Update task (title, date, time, etc.) | `events.patch` |
| Complete or archive task | Event deleted |
| Remove due date | Event deleted |
| Delete task | Event deleted |

### Linking tasks to events

Each task can store `googleEventId` (in `AppState`). The sync API returns this after create/update; `AppContext` saves it via `UPDATE_TASK` so later edits target the same Google event.

### Client flow

```
addTask / updateTask / deleteTask (AppContext)
        ↓
POST /api/calendar/sync  { action, task }
        ↓
Server refreshes access token → Google Calendar API
        ↓
Response { googleEventId } → saved on task (if applicable)
```

Sync is **best-effort**: failures do not block task saves in Life OS.

---

## API Reference

### `GET /api/calendar/connect`

Requires authenticated session. Redirects to Google OAuth.

### `GET /api/calendar/callback`

Handles OAuth code exchange. Saves `googleRefreshToken` on the user document. Redirects to `/` with query `calendar=connected|denied|error|no_refresh_token`.

### `GET /api/calendar/status`

```json
{ "connected": true }
```

### `POST /api/calendar/disconnect`

Clears `googleRefreshToken` for the current user.

### `POST /api/calendar/sync`

**Body:**

```json
{
  "action": "create" | "update" | "delete",
  "task": { /* full Task object */ }
}
```

**Responses:**

```json
{ "ok": true, "googleEventId": "abc123" }
{ "ok": true, "googleEventId": null }
{ "skipped": true, "reason": "not_connected" }
{ "skipped": true, "reason": "no_due_date_or_disabled" }
```

---

## Production Deployment (e.g. Vercel)

1. Add the same env vars in the hosting dashboard:
   - `MONGODB_URI`
   - `AUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `CALENDAR_TIMEZONE` (optional)

2. Add production redirect URI in Google Console:
   ```
   https://your-production-domain.com/api/calendar/callback
   ```

3. If the app remains in **Testing** mode, every user who connects must be listed under **Test users** in the OAuth consent screen.

4. For public use, complete Google's OAuth verification process.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Google Calendar is not configured` | Missing `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` | Set env vars and redeploy |
| `redirect_uri_mismatch` | Callback URL not registered | Add exact URI in Google Console credentials |
| `access_denied` | User cancelled OAuth | Normal; user can retry Connect |
| `no_refresh_token` on redirect | Google did not return refresh token | Disconnect, reconnect; ensure `prompt=consent` (already set in code) |
| Event not created | Task has no due date | Set a due date on the task |
| Event not created | Sync disabled | Enable "Sync tasks with due dates" in sidebar |
| `403` / `accessNotConfigured` | Calendar API not enabled | Enable API in Google Cloud |
| Works locally, fails in prod | Wrong redirect URI or env vars | Match production URL and Vercel env |

Check server logs for lines starting with `Calendar sync error:` or `Calendar callback error:`.

---

## Security Notes

- Refresh tokens live only in MongoDB (`users.googleRefreshToken`).
- OAuth `state` is HMAC-signed with `AUTH_SECRET` to prevent CSRF.
- Calendar routes require an authenticated NextAuth session (except the callback, which validates session + signed state).
- Never commit `.env.local` or real credentials to git.

---

## Optional Enhancements (not implemented)

- Sync **reminders** to calendar
- **Bulk sync** existing tasks after first connect
- Per-user calendar selection (non-primary calendar)
- Two-way sync (Google → Life OS)

---

## Quick Verification Checklist

- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured with `calendar.events` scope
- [ ] Redirect URI matches environment
- [ ] `.env.local` has `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `MONGODB_URI`
- [ ] Dev server restarted
- [ ] Test user added (if app is in Testing mode)
- [ ] Connected via sidebar
- [ ] Created task with due date → event visible in Google Calendar
