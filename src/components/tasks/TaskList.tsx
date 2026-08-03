'use client';

import { useState } from 'react';
import { Plus, ListTodo, SlidersHorizontal } from 'lucide-react';
import { Task, Project, TaskStatus, Priority } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import TaskCard from './TaskCard';
import TaskForm, { taskFormToEntity } from './TaskForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { TASK_STATUS_LABELS, PRIORITY_LABELS, getProjectTasks, sortTasksByPriority, isActiveTask } from '@/lib/utils';
import { BTN_PRIMARY } from '@/lib/constants';

interface Props { project: Project; }

export default function TaskList({ project }: Props) {
  const { state, addTask, updateTask, deleteTask, toggleTopPriority, reorderTasks } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingComplete, setPendingComplete] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const projectTasks = getProjectTasks(state.tasks, project.id);
  const filtered = projectTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });
  const sorted = sortTasksByPriority(filtered);
  const canReorder = filterStatus === 'all' && filterPriority === 'all';

  const todoCount = projectTasks.filter(t => t.status === 'todo').length;
  const activeCount = projectTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = projectTasks.filter(t => t.status === 'completed').length;
  const sel = 'px-3 py-1.5 text-xs bg-surface border border-base rounded-lg text-secondary focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

  const saveTask = (data: Parameters<typeof taskFormToEntity>[0]) => {
    const entity = { ...taskFormToEntity(data), areaId: data.areaId ?? project.areaId, projectId: project.id };
    addTask(entity);
    setShowForm(false);
    toast('Task added');
  };

  const handleStatusToggle = (task: Task) => {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'todo' });
      toast('Task reopened');
      return;
    }
    setPendingComplete(task);
  };

  const moveTask = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= sorted.length) return;
    const ids = sorted.map(t => t.id);
    const [item] = ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, item);
    reorderTasks(ids);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const from = sorted.findIndex(t => t.id === dragId);
    const to = sorted.findIndex(t => t.id === targetId);
    if (from >= 0 && to >= 0) moveTask(from, to);
    setDragId(null);
    setOverId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-primary">
            Tasks
            <span className="ml-2 text-xs font-normal text-muted">{todoCount} todo · {activeCount} active · {doneCount} done</span>
          </h3>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg ${showFilters ? 'bg-raised text-primary' : 'text-muted hover:bg-raised'}`}>
            <SlidersHorizontal size={13} />
          </button>
        </div>
        <button onClick={() => setShowForm(true)} className={BTN_PRIMARY + ' text-xs px-3 py-1.5'}>
          <Plus size={12} />Add Task
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-raised rounded-lg border border-base">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={sel}>
            <option value="all">All Statuses</option>
            {(['todo', 'in_progress', 'waiting', 'completed'] as TaskStatus[]).map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={sel}>
            <option value="all">All Priorities</option>
            {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={ListTodo} title={projectTasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
          action={projectTasks.length === 0 ? <button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add first task</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeletingId(task.id)}
              onToggleTopPriority={() => toggleTopPriority(task.id)}
              onStatusToggle={() => handleStatusToggle(task)}
              canReorder={canReorder && isActiveTask(task)}
              isFirst={index === 0}
              isLast={index === sorted.length - 1}
              onMoveUp={() => moveTask(index, index - 1)}
              onMoveDown={() => moveTask(index, index + 1)}
              onDragStart={() => setDragId(task.id)}
              onDragOver={e => { e.preventDefault(); if (dragId) setOverId(task.id); }}
              onDrop={() => handleDrop(task.id)}
              isDragOver={overId === task.id && dragId !== task.id}
              isDragging={dragId === task.id}
            />
          ))}
        </div>
      )}

      {showForm && <TaskForm defaultProjectId={project.id} defaultAreaId={project.areaId} onSave={saveTask} onClose={() => setShowForm(false)} />}
      {editingTask && (
        <TaskForm task={editingTask} defaultProjectId={project.id}
          onSave={d => { updateTask(editingTask.id, { ...taskFormToEntity(d), areaId: d.areaId ?? project.areaId, projectId: project.id }); setEditingTask(null); toast('Task updated'); }}
          onClose={() => setEditingTask(null)}
        />
      )}
      {deletingId && <ConfirmDialog title="Delete task?" message="This will permanently remove the task." onConfirm={() => { deleteTask(deletingId); setDeletingId(null); toast('Task deleted', 'info'); }} onCancel={() => setDeletingId(null)} />}
      {pendingComplete && (
        <ConfirmDialog
          title="Mark task complete?"
          message={`Confirm you finished “${pendingComplete.title}”.`}
          confirmLabel="Yes, complete"
          cancelLabel="Not yet"
          variant="default"
          onConfirm={() => {
            updateTask(pendingComplete.id, { status: 'completed' });
            toast('Task completed');
            setPendingComplete(null);
          }}
          onCancel={() => setPendingComplete(null)}
        />
      )}
    </div>
  );
}
