'use client';

import { useState } from 'react';
import { Edit2, Trash2, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, Star } from 'lucide-react';
import { Task } from '@/types';
import { PriorityBadge, TaskStatusBadge, FocusQueueBadge } from '@/components/ui/Badge';
import { formatDate, isOverdue, isDueToday, formatDueTime } from '@/lib/utils';

interface Props {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusToggle: () => void;
  onToggleTopPriority?: () => void;
  compact?: boolean;
}

export default function TaskCard({ task, onEdit, onDelete, onStatusToggle, onToggleTopPriority, compact }: Props) {
  const [expanded, setExpanded] = useState(false);
  const done = task.status === 'completed';
  const overdue = isOverdue(task.dueDate) && !done;
  const dueToday = isDueToday(task.dueDate) && !done;
  const StatusIcon = done ? CheckCircle2 : task.status === 'in_progress' ? Clock : Circle;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-base ${done ? 'opacity-60' : ''}`}>
        <button onClick={onStatusToggle} className={`shrink-0 ${done ? 'text-emerald-500' : 'text-muted hover:text-secondary'}`}>
          <StatusIcon size={16} />
        </button>
        <span className={`flex-1 text-sm truncate ${done ? 'line-through text-muted' : 'text-primary'}`}>{task.title}</span>
        {task.isTopPriority && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
        <PriorityBadge priority={task.priority} />
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-xl border transition-all ${
      done ? 'border-base opacity-60' : overdue ? 'border-red-500/30 bg-red-500/5' : 'border-base hover:border-indigo-500/30'
    }`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <button onClick={onStatusToggle} className={`mt-0.5 shrink-0 ${done ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-indigo-400' : 'text-muted hover:text-secondary'}`}>
            <StatusIcon size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className={`text-sm font-medium leading-snug ${done ? 'line-through text-muted' : 'text-primary'}`}>{task.title}</p>
              {task.isTopPriority && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            {task.description && <p className="text-xs text-muted mt-0.5 line-clamp-1">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <PriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} />
              {task.focusQueue && <FocusQueueBadge queue={task.focusQueue} />}
              {task.dueDate && (
                <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-red-400 font-medium' : dueToday ? 'text-amber-400 font-medium' : 'text-muted'}`}>
                  <Calendar size={10} />
                  {dueToday ? 'Today' : overdue ? `Overdue · ${formatDate(task.dueDate)}` : formatDate(task.dueDate)}
                  {task.dueTime && (
                    <>
                      <Clock size={10} />
                      {formatDueTime(task.dueTime)}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onToggleTopPriority && (
              <button onClick={onToggleTopPriority} className={`p-1.5 rounded-lg transition-colors ${task.isTopPriority ? 'text-amber-400' : 'text-muted hover:text-amber-400'}`}>
                <Star size={13} className={task.isTopPriority ? 'fill-amber-400' : ''} />
              </button>
            )}
            {(task.description || task.progressNotes) && (
              <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-muted hover:text-secondary hover:bg-raised rounded-lg">
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
            <button onClick={onEdit} className="p-1.5 text-muted hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg"><Edit2 size={13} /></button>
            <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={13} /></button>
          </div>
        </div>
        {expanded && (task.description || task.progressNotes) && (
          <div className="mt-3 pl-7 space-y-2 border-t border-subtle pt-3">
            {task.description && <p className="text-xs text-secondary leading-relaxed">{task.description}</p>}
            {task.progressNotes && <p className="text-xs text-secondary leading-relaxed whitespace-pre-line">{task.progressNotes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
