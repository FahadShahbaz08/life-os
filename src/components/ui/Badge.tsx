import { Priority, ProjectStatus, TaskStatus, FocusQueue } from '@/types';
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, TASK_STATUS_LABELS, FOCUS_QUEUE_LABELS } from '@/lib/utils';

const base = 'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border';

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  not_started: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  waiting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  in_progress: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  waiting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  archived: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const FOCUS_COLORS: Record<FocusQueue, string> = {
  now: 'bg-red-500/10 text-red-400 border-red-500/20',
  next: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  later: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${base} ${PRIORITY_COLORS[priority]}`}>{PRIORITY_LABELS[priority]}</span>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`${base} ${PROJECT_STATUS_COLORS[status]}`}>{PROJECT_STATUS_LABELS[status]}</span>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`${base} ${TASK_STATUS_COLORS[status]}`}>{TASK_STATUS_LABELS[status]}</span>;
}

export function FocusQueueBadge({ queue }: { queue: FocusQueue }) {
  return <span className={`${base} ${FOCUS_COLORS[queue]}`}>{FOCUS_QUEUE_LABELS[queue]}</span>;
}

export function StatusBadge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`${base} ${colorClass}`}>{label}</span>;
}
