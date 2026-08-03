'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, ArrowLeft } from 'lucide-react';
import { FORM_INPUT } from '@/lib/constants';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      setSuccess(data.message ?? 'Check your email for reset instructions.');
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Brain size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-primary">Forgot password</h1>
          <p className="text-sm text-muted mt-1 text-center">We&apos;ll email you a link to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">{success}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={FORM_INPUT}
              autoComplete="email"
              required
              disabled={!!success}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !!success}
            className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-secondary">
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
