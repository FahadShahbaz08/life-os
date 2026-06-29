'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, Link2, Unlink } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';

interface Props {
  collapsed?: boolean;
}

export default function GoogleCalendarConnect({ collapsed }: Props) {
  const { state, updateSettings } = useApp();
  const { toast } = useToastContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/status');
      if (!res.ok) return;
      const data = await res.json() as { connected: boolean };
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const calendar = searchParams.get('calendar');
    if (!calendar) return;

    if (calendar === 'connected') {
      setConnected(true);
      toast('Google Calendar connected');
    } else if (calendar === 'denied') {
      toast('Google Calendar connection cancelled', 'error');
    } else if (calendar === 'no_refresh_token') {
      toast('Could not get calendar access — try again and approve all permissions', 'error');
    } else if (calendar === 'error') {
      toast('Failed to connect Google Calendar', 'error');
    }

    router.replace('/', { scroll: false });
  }, [searchParams, router, toast]);

  const connect = () => {
    window.location.href = '/api/calendar/connect';
  };

  const disconnect = async () => {
    try {
      const res = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('disconnect failed');
      setConnected(false);
      toast('Google Calendar disconnected');
    } catch {
      toast('Failed to disconnect', 'error');
    }
  };

  if (loading) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={connected ? disconnect : connect}
        title={connected ? 'Google Calendar connected' : 'Connect Google Calendar'}
        className="w-full flex items-center justify-center p-2.5 rounded-xl text-secondary hover:bg-raised"
      >
        <Calendar size={15} className={connected ? 'text-emerald-400' : undefined} />
      </button>
    );
  }

  return (
    <div className="px-2.5 py-2 rounded-xl bg-raised/50 border border-base space-y-2">
      <div className="flex items-center gap-2">
        <Calendar size={14} className={connected ? 'text-emerald-400' : 'text-muted'} />
        <span className="text-xs font-medium text-primary">Google Calendar</span>
        {connected && <span className="text-[10px] text-emerald-400 ml-auto">Connected</span>}
      </div>

      {connected ? (
        <>
          <label className="flex items-center gap-2 text-[11px] text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={state.settings.googleCalendarSyncEnabled}
              onChange={e => updateSettings({ googleCalendarSyncEnabled: e.target.checked })}
              className="rounded border-base"
            />
            Sync tasks with due dates
          </label>
          <button
            type="button"
            onClick={disconnect}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] text-secondary hover:text-red-400 border border-base rounded-lg"
          >
            <Unlink size={12} /> Disconnect
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={connect}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
        >
          <Link2 size={12} /> Connect
        </button>
      )}
    </div>
  );
}
