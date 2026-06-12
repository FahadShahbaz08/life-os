'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Calendar, FileText } from 'lucide-react';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import { PriorityBadge, ProjectStatusBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import ProjectForm from './ProjectForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import TaskList from '@/components/tasks/TaskList';
import { formatDate, projectProgress } from '@/lib/utils';

interface Props { project: Project; }

export default function ProjectDetail({ project }: Props) {
  const { state, updateProject, deleteProject } = useApp();
  const { toast } = useToastContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const progress = projectProgress(project, state.tasks);
  const area = state.areas.find(a => a.id === project.areaId);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <Link href={area ? `/areas/${area.id}` : '/areas'} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary mb-6 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          {area?.name ?? 'Areas'}
        </Link>

        <div className="bg-surface border border-base rounded-2xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-primary mb-1">{project.name}</h1>
              {project.description && <p className="text-sm text-muted mb-3">{project.description}</p>}
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={project.priority} />
                <ProjectStatusBadge status={project.status} />
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => setShowEdit(true)} className="p-2 text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl"><Edit2 size={15} /></button>
              <button onClick={() => setShowDelete(true)} className="p-2 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-xl"><Trash2 size={15} /></button>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-subtle">
            {project.deadline && (
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar size={13} className="text-muted" />
                <span className="text-secondary">{formatDate(project.deadline)}</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted">Progress</span>
              <span className="text-xs font-medium text-secondary">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
          {project.notes && (
            <div className="mt-4 pt-4 border-t border-subtle">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wider mb-1.5"><FileText size={11} />Notes</div>
              <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">{project.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-surface border border-base rounded-2xl p-6">
          <TaskList project={project} />
        </div>
      </div>

      {showEdit && <ProjectForm project={project} onSave={d => { updateProject(project.id, d); setShowEdit(false); toast('Project updated'); }} onClose={() => setShowEdit(false)} />}
      {showDelete && <ConfirmDialog title="Delete project?" message={`"${project.name}" and all its tasks will be permanently deleted.`} onConfirm={() => { deleteProject(project.id); toast('Project deleted', 'info'); window.location.href = area ? `/areas/${area.id}` : '/areas'; }} onCancel={() => setShowDelete(false)} />}
    </>
  );
}
