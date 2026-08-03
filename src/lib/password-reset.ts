import { createHash, randomBytes } from 'crypto';

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getResetExpiryDate(): Date {
  return new Date(Date.now() + RESET_EXPIRY_MS);
}
