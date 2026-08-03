'use client';

import { useApp } from '@/context/AppContext';
import Sidebar from './Sidebar';
import NotificationBell from '@/components/notifications/NotificationBell';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrated, isOnline, syncStatus, forceSync } = useApp();

  if (!hydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-base relative z-10">
        <div className="flex items-center gap-3 text-secondary">
          <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium font-display">Loading Life OS…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-base min-h-0 relative z-10">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden pb-16 md:pb-0">
        <header className="shrink-0 flex items-center justify-end gap-2 px-4 sm:px-6 py-2 border-b border-subtle bg-surface/40 backdrop-blur-sm">
          {(!isOnline || syncStatus === 'offline') && (
            <button
              onClick={forceSync}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
              <WifiOff size={12} />
              Offline — retries auto
              <RefreshCw size={11} />
            </button>
          )}
          {isOnline && syncStatus === 'error' && (
            <button
              onClick={forceSync}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg"
            >
              <RefreshCw size={12} />
              Sync failed — retry
            </button>
          )}
          <NotificationBell />
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto os-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
