import { Suspense } from 'react';
import ForgotPasswordPage from '@/components/auth/ForgotPasswordPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <ForgotPasswordPage />
    </Suspense>
  );
}
