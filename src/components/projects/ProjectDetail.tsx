'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, Trash2, Calendar, FileText, Pin } from 'lucide-react';
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

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary mb-6 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          All Projects
        </Link>

        <div className="bg-surface border border-base rounded-2xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-primary">{project.name}</h1>
                {project.isPinned && <Pin size={14} className="text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              {project.description && <p className="text-sm text-muted mb-3">{project.description}</p>}
              <div className="flex flex-wrap gap-2 mb-2">
                <PriorityBadge priority={project.priority} />
                <ProjectStatusBadge status={project.status} />
                {(project.tags ?? []).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 capitalize">{tag.replace(/-/g, ' ')}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => { updateProject(project.id, { isPinned: !project.isPinned }); toast(project.isPinned ? 'Unpinned' : 'Pinned'); }}
                className={`p-2 rounded-xl ${project.isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-muted hover:text-amber-400 hover:bg-amber-500/10'}`}
                title={project.isPinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={15} className={project.isPinned ? 'fill-current' : ''} />
              </button>
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
      {showDelete && <ConfirmDialog title="Delete project?" message={`"${project.name}" and all its tasks will be permanently deleted.`} onConfirm={() => { deleteProject(project.id); toast('Project deleted', 'info'); window.location.href = '/projects'; }} onCancel={() => setShowDelete(false)} />}
    </>
  );
}
