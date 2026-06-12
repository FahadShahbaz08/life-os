'use client';

import { useState } from 'react';
import { Plus, ListTodo } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import EmptyState from '@/components/ui/EmptyState';
import { isActiveTask, sortTasksByPriority } from '@/lib/utils';
import { BTN_PRIMARY } from '@/lib/constants';

export default function TasksPage() {
  const { state, addTask, updateTask, deleteTask, toggleTopPriority } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<import('@/types').Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');

  const tasks = sortTasksByPriority(
    state.tasks.filter(t => {
      if (filter === 'active') return isActiveTask(t);
      if (filter === 'completed') return t.status === 'completed';
      return true;
    })
  );

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="All Tasks" subtitle={`${state.tasks.filter(isActiveTask).length} active tasks`}
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />New Task</button>}
        />

        <div className="flex gap-2 mb-6">
          {(['active', 'completed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize ${filter === f ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-raised text-muted border border-base'}`}>{f}</button>
          ))}
        </div>

        {tasks.length === 0 ? (
          <EmptyState icon={ListTodo} title="No tasks" action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add task</button>} />
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task}
                onEdit={() => setEditing(task)}
                onDelete={() => { deleteTask(task.id); toast('Deleted', 'info'); }}
                onToggleTopPriority={() => toggleTopPriority(task.id)}
                onStatusToggle={() => updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' })}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TaskForm onSave={d => { addTask(taskFormToEntity(d)); setShowForm(false); toast('Task created'); }} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <TaskForm task={editing} onSave={d => { updateTask(editing.id, taskFormToEntity(d)); setEditing(null); toast('Updated'); }} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
