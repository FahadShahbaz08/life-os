'use client';

import Link from 'next/link';
import { Calendar, ChevronRight, Pin } from 'lucide-react';
import { Project } from '@/types';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatDate, isOverdue, projectProgress, getProjectTasks, isActiveTask, PROJECT_STATUS_LABELS } from '@/lib/utils';

interface Props {
  project: Project;
  tasks: import('@/types').Task[];
  href?: string;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
  onTogglePin?: () => void;
}

export default function ProjectCard({ project, tasks, href, onClick, isSelected, compact, onTogglePin }: Props) {
  const projectTasks = getProjectTasks(tasks, project.id);
  const progress = projectProgress(project, tasks);
  const overdue = isOverdue(project.deadline) && project.status !== 'completed';
  const pending = projectTasks.filter(isActiveTask).length;
  const done = projectTasks.filter(t => t.status === 'completed').length;
  const tags = project.tags ?? [];

  if (compact) {
    const className = `w-full text-left px-2.5 py-2 rounded-xl transition-colors ${isSelected ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-raised text-secondary hover:text-primary'}`;
    const inner = (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium truncate flex-1">{project.name}</span>
        {pending > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-raised text-muted shrink-0">{pending}</span>}
      </div>
    );
    if (href) return <Link href={href} className={className}>{inner}</Link>;
    return <button onClick={onClick} className={className}>{inner}</button>;
  }

  const borderClass = isSelected
    ? 'border-indigo-500/40'
    : overdue
      ? 'border-red-500/30'
      : project.isPinned
        ? 'border-amber-500/25'
        : 'border-base hover:border-indigo-500/25';

  const body = (
    <>
      <div className="flex items-start gap-3 mb-3 pr-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {project.isPinned && <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            <h3 className="text-base font-semibold text-primary truncate">{project.name}</h3>
          </div>
          {project.description ? (
            <p className="text-xs text-muted line-clamp-2 mt-1">{project.description}</p>
          ) : (
            <p className="text-xs text-muted mt-1">{PROJECT_STATUS_LABELS[project.status]}</p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-raised text-secondary border border-base capitalize">
              {tag.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}

      <ProgressBar value={progress} size="sm" showLabel />

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle text-xs text-muted">
        <span>
          {projectTasks.length === 0 ? 'No tasks yet' : `${done}/${projectTasks.length} tasks done`}
          {pending > 0 && <span className="text-indigo-400 ml-1.5">· {pending} active</span>}
        </span>
        {project.deadline && (
          <span className={`inline-flex items-center gap-1 shrink-0 ${overdue ? 'text-red-400 font-medium' : ''}`}>
            <Calendar size={11} />
            {overdue ? 'Overdue' : formatDate(project.deadline)}
          </span>
        )}
      </div>
    </>
  );

  return (
    <div className={`relative bg-surface rounded-2xl border transition-all ${borderClass} ${href ? 'hover:shadow-md hover:shadow-black/5' : ''}`}>
      {onTogglePin && (
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
          className={`absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors z-10 ${
            project.isPinned
              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
              : 'text-muted hover:text-amber-400 hover:bg-raised opacity-60 hover:opacity-100'
          }`}
          title={project.isPinned ? 'Unpin' : 'Pin project'}
        >
          <Pin size={14} className={project.isPinned ? 'fill-current' : ''} />
        </button>
      )}

      {href ? (
        <Link href={href} className="block p-5 group">
          {body}
          <ChevronRight size={16} className="absolute bottom-5 right-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </Link>
      ) : (
        <button onClick={onClick} className="block w-full text-left p-5">{body}</button>
      )}
    </div>
  );
}
