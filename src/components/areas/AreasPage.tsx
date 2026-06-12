'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FolderKanban } from 'lucide-react';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/ui/PageHeader';
import ProjectCard from '@/components/projects/ProjectCard';
import ProjectForm from '@/components/projects/ProjectForm';
import EmptyState from '@/components/ui/EmptyState';
import { getAreaIcon } from '@/lib/area-icons';
import { getAreaProjects } from '@/lib/utils';

export default function AreasPage() {
  const { state } = useApp();
  const areas = state.areas.filter(a => !a.isArchived).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Life Areas" subtitle="Permanent domains that organize your life" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map(area => {
            const Icon = getAreaIcon(area.icon);
            const projects = getAreaProjects(state.projects, area.id);
            const tasks = state.tasks.filter(t => t.areaId === area.id && t.status !== 'completed');
            return (
              <Link key={area.id} href={`/areas/${area.id}`}
                className="bg-surface border border-base rounded-2xl p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${area.color}20` }}>
                    <Icon size={20} style={{ color: area.color }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-primary group-hover:text-indigo-400">{area.name}</h3>
                    <p className="text-xs text-muted">{projects.length} projects · {tasks.length} active tasks</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
    </div>
  );
}

export function AreaDetailPage({ areaId }: { areaId: string }) {
  const { state, addProject } = useApp();
  const [showForm, setShowForm] = useState(false);
  const area = state.areas.find(a => a.id === areaId);
  const projects = getAreaProjects(state.projects, areaId);

  if (!area) {
    return <div className="py-24 text-center"><p className="text-muted">Area not found</p></div>;
  }

  const Icon = getAreaIcon(area.icon);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${area.color}20` }}>
            <Icon size={24} style={{ color: area.color }} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary">{area.name}</h1>
            <p className="text-sm text-muted">{projects.length} projects</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl">
            <Plus size={14} />New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <EmptyState icon={FolderKanban} title="No projects in this area"
            action={<button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl">Create project</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} tasks={state.tasks} href={`/projects/${p.id}`} />)}
          </div>
        )}
      </div>

      {showForm && (
        <ProjectForm defaultAreaId={areaId} onSave={(d: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => { addProject(d); setShowForm(false); }} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
