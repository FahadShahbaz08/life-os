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
import { TASK_STATUS_LABELS, PRIORITY_LABELS, isOverdue, getProjectTasks, sortTasksByPriority, isActiveTask } from '@/lib/utils';

interface Props { project: Project; }

export default function TaskList({ project }: Props) {
  const { state, addTask, updateTask, deleteTask, toggleTopPriority } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const projectTasks = getProjectTasks(state.tasks, project.id);
  const filtered = projectTasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });
  const sorted = sortTasksByPriority(filtered).sort((a, b) => {
    const aOvd = isOverdue(a.dueDate) && isActiveTask(a) ? -1 : 0;
    const bOvd = isOverdue(b.dueDate) && isActiveTask(b) ? -1 : 0;
    return aOvd - bOvd;
  });

  const todoCount = projectTasks.filter(t => t.status === 'todo').length;
  const activeCount = projectTasks.filter(t => t.status === 'in_progress').length;
  const doneCount = projectTasks.filter(t => t.status === 'completed').length;
  const sel = 'px-3 py-1.5 text-xs bg-surface border border-base rounded-lg text-secondary focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const saveTask = (data: Parameters<typeof taskFormToEntity>[0]) => {
    const entity = { ...taskFormToEntity(data), areaId: data.areaId ?? project.areaId, projectId: project.id };
    addTask(entity);
    setShowForm(false);
    toast('Task added');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-primary">
            Tasks
            <span className="ml-2 text-xs font-normal text-muted">{todoCount} todo · {activeCount} active · {doneCount} done</span>
          </h3>
          <button onClick={() => setShowFilters(!showFilters)} className={`p-1.5 rounded-lg ${showFilters ? 'bg-indigo-500/10 text-indigo-400' : 'text-muted hover:bg-raised'}`}>
            <SlidersHorizontal size={13} />
          </button>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl">
          <Plus size={12} />Add Task
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-raised rounded-xl border border-base">
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
          action={projectTasks.length === 0 ? <button onClick={() => setShowForm(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl">Add first task</button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map(task => (
            <TaskCard key={task.id} task={task}
              onEdit={() => setEditingTask(task)}
              onDelete={() => setDeletingId(task.id)}
              onToggleTopPriority={() => toggleTopPriority(task.id)}
              onStatusToggle={() => {
                const next: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
                updateTask(task.id, { status: next });
                toast(next === 'completed' ? 'Task completed' : 'Task reopened');
              }}
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
    </div>
  );
}
