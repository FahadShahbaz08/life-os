import { Suspense } from 'react';
import LoginPage from '@/components/auth/LoginPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <LoginPage />
    </Suspense>
  );
}
