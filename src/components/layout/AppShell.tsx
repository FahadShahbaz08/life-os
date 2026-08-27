'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import Sidebar from './Sidebar';
import MobileDock from './MobileDock';
import NotificationBell from '@/components/notifications/NotificationBell';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrated, isOnline, syncStatus, forceSync } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

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
      <MobileDock menuOpen={menuOpen} onMenuOpenChange={setMenuOpen} />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <header className="shrink-0 relative z-[100] flex items-center justify-between gap-2 px-4 sm:px-6 py-2 border-b border-subtle bg-surface/40 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary bg-raised border border-base rounded-lg touch-manipulation"
          >
            <LayoutGrid size={14} />
            Menu
          </button>
          <div className="flex items-center justify-end gap-2 ml-auto">
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
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden os-scroll relative">
          {children}
        </div>
      </main>
    </div>
  );
}
