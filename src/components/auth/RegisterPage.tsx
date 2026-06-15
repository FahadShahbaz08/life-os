'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain } from 'lucide-react';
import { FORM_INPUT } from '@/lib/constants';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        setLoading(false);
        return;
      }

      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created but sign-in failed. Try logging in.');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
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
          <h1 className="text-xl font-bold text-primary">Create account</h1>
          <p className="text-sm text-muted mt-1">Your Life OS, synced in the cloud</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={FORM_INPUT} autoComplete="name" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={FORM_INPUT} autoComplete="email" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={FORM_INPUT} autoComplete="new-password" minLength={8} required />
            <p className="text-[10px] text-muted mt-1">At least 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
