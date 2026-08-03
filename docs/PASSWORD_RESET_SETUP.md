# Password Reset — Developer Setup

Life OS uses email-based password reset. Users request a link from **Forgot password?** on the login page.

## Flow

1. User submits email on `/forgot-password`
2. Server creates a secure token (1-hour expiry), stores a hash in MongoDB
3. Email sent with link to `/reset-password?token=...`
4. User sets a new password; token is invalidated

## Environment variables

Add to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com
```

### Gmail example

1. Enable 2-Step Verification on your Google account
2. Create an **App Password** (Google Account → Security → App passwords)
3. Use that 16-character password as `SMTP_PASS`

### Development without SMTP

If SMTP is not configured and `NODE_ENV=development`, the reset link is **printed in the terminal** where `npm run dev` is running. The API still returns success (without revealing whether the email exists).

In **production**, SMTP must be configured or reset emails will fail.

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/forgot-password` | POST | `{ email }` — send reset link |
| `/api/auth/reset-password` | GET | `?token=` — validate token |
| `/api/auth/reset-password` | POST | `{ token, password }` — set new password |

## Security

- Reset tokens are hashed (SHA-256) before storage
- Tokens expire after **1 hour**
- Forgot-password always returns the same success message (no email enumeration)
- Used tokens are cleared after a successful reset

## Pages

- `/login` — includes **Forgot password?** link
- `/forgot-password` — request reset email
- `/reset-password?token=...` — set new password
