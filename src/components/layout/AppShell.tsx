'use client';

import { useApp } from '@/context/AppContext';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrated } = useApp();

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-base">
        <div className="flex items-center gap-3 text-secondary">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Life OS…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-base min-h-0">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden pb-16 md:pb-0">
        <div className="flex-1 min-h-0 overflow-y-auto os-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
