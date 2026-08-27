'use client';

import { useEffect } from 'react';
import { MAIN_NAV } from '@/components/layout/nav';

const CACHE = 'lifeos-shell-v2';

export default function OfflineWarm() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    if (!('caches' in window) || !navigator.onLine) return;

    const paths = [
      '/',
      '/login',
      '/manifest.webmanifest',
      '/icon.svg',
      ...MAIN_NAV.map(item => item.href),
    ];

    void caches.open(CACHE).then(async cache => {
      await Promise.all(
        [...new Set(paths)].map(async path => {
          try {
            const res = await fetch(path, { credentials: 'include' });
            if (res.ok) await cache.put(path, res);
          } catch {
            // skip failed warm
          }
        })
      );
    });
  }, []);

  return null;
}
