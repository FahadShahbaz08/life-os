'use client';

import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { Project } from '@/types';
import { PriorityBadge, ProjectStatusBadge } from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import { formatDate, isOverdue, projectProgress, PRIORITY_DOT, getProjectTasks, isActiveTask } from '@/lib/utils';

interface Props {
  project: Project;
  tasks: import('@/types').Task[];
  href?: string;
  onClick?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export default function ProjectCard({ project, tasks, href, onClick, isSelected, compact }: Props) {
  const projectTasks = getProjectTasks(tasks, project.id);
  const progress = projectProgress(project, tasks);
  const overdue = isOverdue(project.deadline) && project.status !== 'completed';
  const pending = projectTasks.filter(isActiveTask).length;

  const inner = (
    <>
      {compact ? (
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[project.priority]}`} />
          <span className="text-xs font-medium truncate flex-1">{project.name}</span>
          {pending > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-raised text-muted shrink-0">{pending}</span>}
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-primary truncate">{project.name}</h3>
              {project.description && <p className="text-xs text-muted truncate mt-0.5">{project.description}</p>}
            </div>
            <ChevronRight size={15} className="text-muted group-hover:text-indigo-400 shrink-0 mt-0.5" />
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <PriorityBadge priority={project.priority} />
            <ProjectStatusBadge status={project.status} />
          </div>
          <ProgressBar value={progress} size="sm" showLabel />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle">
            <span className="text-xs text-muted">
              {projectTasks.length === 0 ? 'No tasks' : `${projectTasks.filter(t => t.status === 'completed').length}/${projectTasks.length} done`}
            </span>
            {project.deadline && (
              <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-400 font-medium' : 'text-muted'}`}>
                <Calendar size={10} />
                {overdue ? 'Overdue' : formatDate(project.deadline)}
              </span>
            )}
          </div>
        </>
      )}
    </>
  );

  const className = compact
    ? `w-full text-left px-2.5 py-2 rounded-xl transition-colors group ${isSelected ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-raised text-secondary hover:text-primary'}`
    : `w-full text-left bg-surface rounded-2xl border p-5 transition-all hover:shadow-lg group ${isSelected ? 'border-indigo-500/40' : overdue ? 'border-red-500/30' : 'border-base hover:border-indigo-500/30'}`;

  if (href) {
    return <Link href={href} className={className}>{inner}</Link>;
  }
  return <button onClick={onClick} className={className}>{inner}</button>;
}
