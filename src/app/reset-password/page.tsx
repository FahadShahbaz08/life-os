import { Suspense } from 'react';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <ResetPasswordPage />
    </Suspense>
  );
}
