'use client';

import { useState, useEffect } from 'react';
import { Plus, ListTodo, Sparkles } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Task } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import SelfReflectionPanel from '@/components/tasks/SelfReflectionPanel';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { isActiveTask, sortTasksByPriority } from '@/lib/utils';
import { BTN_PRIMARY, BTN_TAB_ACTIVE, BTN_TAB_IDLE } from '@/lib/constants';

type PageTab = 'tasks' | 'reflection';

export default function TasksPage() {
  const { state, addTask, updateTask, deleteTask, toggleTopPriority, reorderTasks } = useApp();
  const { toast } = useToastContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get('view');
  const [pageTab, setPageTab] = useState<PageTab>(viewParam === 'reflection' ? 'reflection' : 'tasks');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [pendingComplete, setPendingComplete] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    setPageTab(viewParam === 'reflection' ? 'reflection' : 'tasks');
  }, [viewParam]);

  const switchTab = (tab: PageTab) => {
    setPageTab(tab);
    const url = tab === 'reflection' ? '/tasks?view=reflection' : '/tasks';
    router.replace(url, { scroll: false });
  };

  const tasks = sortTasksByPriority(
    state.tasks.filter(t => {
      if (filter === 'active') return isActiveTask(t);
      if (filter === 'completed') return t.status === 'completed';
      return true;
    })
  );
  const canReorder = filter === 'active';

  const handleStatusToggle = (task: Task) => {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'todo' });
      toast('Reopened');
      return;
    }
    setPendingComplete(task);
  };

  const moveTask = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= tasks.length) return;
    const ids = tasks.map(t => t.id);
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
    const from = tasks.findIndex(t => t.id === dragId);
    const to = tasks.findIndex(t => t.id === targetId);
    if (from >= 0 && to >= 0) moveTask(from, to);
    setDragId(null);
    setOverId(null);
  };

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        {/* High-visibility page switcher — first thing on the page */}
        <div
          role="tablist"
          aria-label="Tasks sections"
          className="flex w-full p-1 mb-5 rounded-xl bg-raised border border-base gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={pageTab === 'tasks'}
            onClick={() => switchTab('tasks')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              pageTab === 'tasks'
                ? 'bg-surface text-primary shadow-sm border border-base'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <ListTodo size={15} />
            Tasks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pageTab === 'reflection'}
            onClick={() => switchTab('reflection')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              pageTab === 'reflection'
                ? 'bg-surface text-primary shadow-sm border border-base'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <Sparkles size={15} />
            Self Reflection
          </button>
        </div>

        <PageHeader
          title={pageTab === 'tasks' ? 'All Tasks' : 'Self Reflection'}
          subtitle={
            pageTab === 'tasks'
              ? `${state.tasks.filter(isActiveTask).length} active · drag grip to reorder`
              : 'Daily checklist you design yourself'
          }
          action={
            pageTab === 'tasks' ? (
              <button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />New Task</button>
            ) : undefined
          }
        />

        {pageTab === 'reflection' ? (
          <SelfReflectionPanel />
        ) : (
          <>
            <div className="flex gap-2 mb-6">
              {(['active', 'completed', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize border ${filter === f ? BTN_TAB_ACTIVE : BTN_TAB_IDLE}`}>{f}</button>
              ))}
            </div>

            {tasks.length === 0 ? (
              <EmptyState icon={ListTodo} title="No tasks" action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add task</button>} />
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditing(task)}
                    onDelete={() => { deleteTask(task.id); toast('Deleted', 'info'); }}
                    onToggleTopPriority={() => toggleTopPriority(task.id)}
                    onStatusToggle={() => handleStatusToggle(task)}
                    canReorder={canReorder}
                    isFirst={index === 0}
                    isLast={index === tasks.length - 1}
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
          </>
        )}
      </div>

      {showForm && (
        <TaskForm onSave={d => { addTask(taskFormToEntity(d)); setShowForm(false); toast('Task created'); }} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <TaskForm task={editing} onSave={d => { updateTask(editing.id, taskFormToEntity(d)); setEditing(null); toast('Updated'); }} onClose={() => setEditing(null)} />
      )}
      {pendingComplete && (
        <ConfirmDialog
          title="Mark task complete?"
          message={`Confirm you finished “${pendingComplete.title}”.`}
          confirmLabel="Yes, complete"
          cancelLabel="Not yet"
          variant="default"
          onConfirm={() => {
            updateTask(pendingComplete.id, { status: 'completed' });
            setPendingComplete(null);
            toast('Completed');
          }}
          onCancel={() => setPendingComplete(null)}
        />
      )}
    </>
  );
}
