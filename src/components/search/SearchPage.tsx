'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/ui/PageHeader';
import { globalSearch } from '@/lib/utils';

const TYPE_PATHS: Record<string, string> = {
  task: '/tasks', note: '/notes', project: '/projects', goal: '/goals', habit: '/habits', area: '/projects',
};

export default function SearchPage() {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const results = globalSearch(state, query);

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Search" subtitle="Find anything across your Life OS" />

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks, notes, projects, goals…" autoFocus
            className="w-full pl-11 pr-4 py-3 text-sm bg-surface border border-base rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {!query.trim() ? (
          <p className="text-sm text-muted text-center py-12">Start typing to search your entire Life OS</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted text-center py-12">No results for &quot;{query}&quot;</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => (
              <section key={type}>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{type}s ({items.length})</h2>
                <div className="space-y-1">
                  {items.map(r => (
                    <Link key={r.id} href={type === 'project' ? `/projects/${r.id}` : TYPE_PATHS[type] ?? '/'}
                      className="block px-4 py-3 bg-surface border border-base rounded-xl hover:border-indigo-500/30 transition-colors">
                      <p className="text-sm font-medium text-primary">{r.title}</p>
                      <p className="text-xs text-muted">{r.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
    </div>
  );
}
