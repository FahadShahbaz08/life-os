'use client';

import { useState } from 'react';
import {
  Edit2, Trash2, Calendar, ChevronDown, ChevronUp, CheckCircle2, Circle, Clock, Star, GripVertical,
} from 'lucide-react';
import { Task } from '@/types';
import { PriorityBadge, TaskStatusBadge } from '@/components/ui/Badge';
import { formatDate, isOverdue, isDueToday, formatDueTime } from '@/lib/utils';

interface Props {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusToggle: () => void;
  onToggleTopPriority?: () => void;
  compact?: boolean;
  /** Drag / reorder */
  canReorder?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  isDragOver?: boolean;
  isDragging?: boolean;
}

export default function TaskCard({
  task, onEdit, onDelete, onStatusToggle, onToggleTopPriority, compact,
  canReorder, onMoveUp, onMoveDown, isFirst, isLast,
  onDragStart, onDragOver, onDrop, isDragOver, isDragging,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const done = task.status === 'completed';
  const overdue = isOverdue(task.dueDate) && !done;
  const dueToday = isDueToday(task.dueDate) && !done;
  const StatusIcon = done ? CheckCircle2 : task.status === 'in_progress' ? Clock : Circle;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-base min-w-0 w-full ${done ? 'opacity-60' : ''} ${isDragOver ? 'border-primary bg-raised' : ''} ${isDragging ? 'opacity-40' : ''}`}
        onDragOver={onDragOver}
        onDrop={e => { e.preventDefault(); onDrop?.(); }}
      >
        {canReorder && (
          <button
            type="button"
            draggable
            onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
            className="p-0.5 text-muted hover:text-primary cursor-grab active:cursor-grabbing shrink-0"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
        )}
        <button onClick={onStatusToggle} className={`shrink-0 ${done ? 'text-[var(--chart-pos)]' : 'text-muted hover:text-primary'}`}>
          <StatusIcon size={16} />
        </button>
        <span className={`flex-1 min-w-0 text-sm break-all ${done ? 'line-through text-muted' : 'text-primary'}`}>{task.title}</span>
        {task.isTopPriority && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
        <PriorityBadge priority={task.priority} />
      </div>
    );
  }

  return (
    <div
      className={`bg-surface rounded-lg border transition-all min-w-0 w-full overflow-hidden ${
        done ? 'border-base opacity-60' : overdue ? 'border-red-500/25 bg-red-500/[0.03]' : 'border-base hover:border-[var(--border)]'
      } ${isDragOver ? 'border-primary ring-1 ring-[var(--accent)]/20' : ''} ${isDragging ? 'opacity-40' : ''}`}
      onDragOver={onDragOver}
      onDrop={e => { e.preventDefault(); onDrop?.(); }}
    >
      <div className="px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {canReorder && (
            <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
              <button
                type="button"
                draggable
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
                className="p-1 text-muted hover:text-primary cursor-grab active:cursor-grabbing rounded-md hover:bg-raised"
                aria-label="Drag to reorder"
                title="Drag to reorder"
              >
                <GripVertical size={15} />
              </button>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-0.5 text-muted hover:text-primary disabled:opacity-20 rounded"
                title="Move up"
                aria-label="Move up"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={isLast}
                className="p-0.5 text-muted hover:text-primary disabled:opacity-20 rounded"
                title="Move down"
                aria-label="Move down"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          )}
          <button onClick={onStatusToggle} className={`mt-0.5 shrink-0 ${done ? 'text-[var(--chart-pos)]' : task.status === 'in_progress' ? 'text-primary' : 'text-muted hover:text-secondary'}`}>
            <StatusIcon size={17} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
              <p className={`text-sm font-medium leading-snug break-all min-w-0 ${done ? 'line-through text-muted' : 'text-primary'}`}>{task.title}</p>
              {task.isTopPriority && <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
            </div>
            {task.description && <p className="text-xs text-muted mt-0.5 line-clamp-1 break-all">{task.description}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <PriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} />
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
          <div className="flex items-center gap-0.5 shrink-0">
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
            <button onClick={onEdit} className="p-1.5 text-muted hover:text-primary hover:bg-raised rounded-lg"><Edit2 size={13} /></button>
            <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={13} /></button>
          </div>
        </div>
        {expanded && (task.description || task.progressNotes) && (
          <div className="mt-3 pl-7 space-y-2 border-t border-subtle pt-3">
            {task.description && <p className="text-xs text-secondary leading-relaxed break-all">{task.description}</p>}
            {task.progressNotes && <p className="text-xs text-secondary leading-relaxed whitespace-pre-line">{task.progressNotes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
