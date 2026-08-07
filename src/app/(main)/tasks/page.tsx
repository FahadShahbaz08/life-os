import { Suspense } from 'react';
import TasksPage from '@/components/tasks/TasksPage';

export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-6 text-sm text-muted">Loading…</div>}>
      <TasksPage />
    </Suspense>
  );
}
