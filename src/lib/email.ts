import nodemailer from 'nodemailer';

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ sent: boolean; devLogged?: boolean }> {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'noreply@lifeos.app';

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.log('\n[Life OS] Password reset link (SMTP not configured):\n', resetUrl, '\n');
      return { sent: false, devLogged: true };
    }
    throw new Error('SMTP is not configured');
  }

  const transport = createTransport();
  await transport.sendMail({
    from: `"Life OS" <${from}>`,
    to,
    subject: 'Reset your Life OS password',
    text: [
      'You requested a password reset for your Life OS account.',
      '',
      'Click the link below to set a new password (valid for 1 hour):',
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>You requested a password reset for your <strong>Life OS</strong> account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour.</p>
      <p style="color:#666;font-size:12px">If you did not request this, ignore this email.</p>
    `,
  });

  return { sent: true };
}
