'use client';

import { useMemo, useState } from 'react';
import { Plus, Search, Pin, FolderKanban } from 'lucide-react';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectForm from '@/components/projects/ProjectForm';
import EmptyState from '@/components/ui/EmptyState';
import { BTN_PRIMARY } from '@/lib/constants';

export default function ProjectsPage() {
  const { state, addProject, updateProject } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const activeProjects = state.projects.filter(p => p.status !== 'archived');

  const usedTags = useMemo(() => {
    const counts = new Map<string, number>();
    activeProjects.forEach(p => {
      (p.tags ?? []).forEach(tag => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag);
  }, [activeProjects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeProjects.filter(p => {
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.tags ?? []).some(t => t.toLowerCase().includes(q));
      const matchesTag = !tagFilter || (p.tags ?? []).includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [activeProjects, search, tagFilter]);

  const pinned = filtered.filter(p => p.isPinned);
  const rest = filtered.filter(p => !p.isPinned);

  const togglePin = (p: Project) => {
    updateProject(p.id, { isPinned: !p.isPinned });
    toast(p.isPinned ? 'Unpinned' : 'Pinned to top');
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Projects"
          subtitle={`${activeProjects.length} project${activeProjects.length === 1 ? '' : 's'}`}
          action={
            <button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>
              <Plus size={14} />New Project
            </button>
          }
        />

        <div className="bg-surface border border-base rounded-2xl p-4 mb-6 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search projects or tags…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-raised border border-base rounded-xl focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-subtle">
              <FilterChip label="All" active={!tagFilter} onClick={() => setTagFilter(null)} />
              {usedTags.map(tag => (
                <FilterChip
                  key={tag}
                  label={tag.replace(/-/g, ' ')}
                  active={tagFilter === tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                />
              ))}
            </div>
          )}
        </div>

        {activeProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Group work by project — add tags like business or learning, then add tasks inside."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Create project</button>}
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted mb-3">No projects match your search.</p>
            <button onClick={() => { setSearch(''); setTagFilter(null); }} className="text-sm text-indigo-400 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {pinned.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Pin size={11} className="text-amber-400" /> Pinned
                </h2>
                <div className="space-y-3">
                  {pinned.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      tasks={state.tasks}
                      href={`/projects/${p.id}`}
                      onTogglePin={() => togglePin(p)}
                    />
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                {pinned.length > 0 && (
                  <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-3">
                    {tagFilter || search ? 'Results' : 'All projects'}
                  </h2>
                )}
                <div className="space-y-3">
                  {rest.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      tasks={state.tasks}
                      href={`/projects/${p.id}`}
                      onTogglePin={() => togglePin(p)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <ProjectForm
          onSave={(d: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
            addProject(d);
            setShowForm(false);
            toast('Project created');
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-raised text-secondary hover:text-primary border border-base'
      }`}
    >
      {label}
    </button>
  );
}
