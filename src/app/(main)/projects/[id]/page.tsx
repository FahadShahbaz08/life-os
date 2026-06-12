'use client';

import { use } from 'react';
import { useApp } from '@/context/AppContext';
import ProjectDetail from '@/components/projects/ProjectDetail';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { state } = useApp();
  const project = state.projects.find(p => p.id === id);

  if (!project) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-muted">Project not found</p></div>;
  }
  return <ProjectDetail project={project} />;
}
