'use client';

import { useState } from 'react';
import { Target, ArrowRight, ArrowDown, Plus, ListPlus, Inbox } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import Modal, { ModalBody } from '@/components/ui/Modal';
import { computeFocusQueue, FOCUS_QUEUE_LABELS, isActiveTask, sortTasksByPriority } from '@/lib/utils';
import { FocusQueue } from '@/types';

const QUEUES: FocusQueue[] = ['now', 'next', 'later'];
const LIMITS: Record<FocusQueue, number> = { now: 3, next: 7, later: 999 };

export default function FocusPage() {
  const { state, updateTask, addTask, deleteTask } = useApp();
  const { toast } = useToastContext();
  const queue = computeFocusQueue(state.tasks);
  const [addToQueue, setAddToQueue] = useState<FocusQueue | null>(null);
  const [pickForQueue, setPickForQueue] = useState<FocusQueue | null>(null);

  const unassigned = sortTasksByPriority(
    state.tasks.filter(t => isActiveTask(t) && !t.focusQueue)
  );

  const promote = (taskId: string, to: FocusQueue) => {
    const target = queue[to];
    if (target.length >= LIMITS[to] && !target.find(t => t.id === taskId)) {
      toast(`"${FOCUS_QUEUE_LABELS[to]}" is full (max ${LIMITS[to]})`, 'error');
      return;
    }
    updateTask(taskId, { focusQueue: to });
    toast(`Moved to ${FOCUS_QUEUE_LABELS[to]}`);
  };

  const demote = (taskId: string, from: FocusQueue) => {
    const order: FocusQueue[] = ['now', 'next', 'later'];
    const idx = order.indexOf(from);
    if (idx < order.length - 1) promote(taskId, order[idx + 1]);
    else {
      updateTask(taskId, { focusQueue: null });
      toast('Removed from focus queue');
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Focus Queue"
          subtitle="Add tasks to Now (max 3), Next (max 7), or Later — this drives Focus Now on Today"
        />

        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-6 text-xs text-secondary space-y-1">
          <p><strong className="text-primary">Now</strong> — what you&apos;re working on right now (shows as Focus Now on Today)</p>
          <p><strong className="text-primary">Next</strong> — up next when Now is clear</p>
          <p><strong className="text-primary">Later</strong> — backlog, out of sight</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {QUEUES.map(q => (
            <div key={q} className="bg-surface border border-base rounded-2xl p-4 flex flex-col min-h-[200px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target size={14} className={q === 'now' ? 'text-red-400' : q === 'next' ? 'text-amber-400' : 'text-muted'} />
                  <h2 className="text-sm font-semibold text-primary">{FOCUS_QUEUE_LABELS[q]}</h2>
                </div>
                <span className="text-xs text-muted">{queue[q].length}/{LIMITS[q] < 999 ? LIMITS[q] : '∞'}</span>
              </div>

              <div className="flex gap-1 mb-3">
                <button onClick={() => setAddToQueue(q)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg">
                  <Plus size={12} /> New
                </button>
                <button onClick={() => setPickForQueue(q)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-secondary bg-raised hover:bg-base border border-base rounded-lg">
                  <ListPlus size={12} /> Existing
                </button>
              </div>

              <div className="space-y-2">
                {queue[q].length === 0 ? (
                  <p className="text-xs text-muted py-4 text-center">Empty — click New to add</p>
                ) : (
                  queue[q].map(task => (
                    <div key={task.id}>
                      <TaskCard task={task} compact onEdit={() => {}} onDelete={() => { deleteTask(task.id); toast('Removed', 'info'); }}
                        onStatusToggle={() => updateTask(task.id, { status: 'completed' })}
                      />
                      <div className="flex gap-1 mt-1">
                        {q !== 'now' && (
                          <button onClick={() => promote(task.id, q === 'later' ? 'next' : 'now')} className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-indigo-400 hover:bg-indigo-500/10 rounded">
                            <ArrowRight size={10} /> Promote
                          </button>
                        )}
                        {q !== 'later' && (
                          <button onClick={() => demote(task.id, q)} className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-muted hover:bg-raised rounded">
                            <ArrowDown size={10} /> Demote
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned tasks — assign to focus queue */}
        <section className="bg-surface border border-base rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Inbox size={15} className="text-muted" />
            <h2 className="text-sm font-semibold text-primary">Not in focus queue ({unassigned.length})</h2>
          </div>
          <p className="text-xs text-muted mb-4">These tasks exist but aren&apos;t in Now / Next / Later. Assign them below.</p>

          {unassigned.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">All active tasks are assigned to a focus column.</p>
          ) : (
            <div className="space-y-2">
              {unassigned.map(task => (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-base bg-raised/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">{task.title}</p>
                    {task.dueDate && <p className="text-[11px] text-muted">Due {task.dueDate}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {QUEUES.map(q => (
                      <button key={q} onClick={() => promote(task.id, q)}
                        className={`px-2 py-1 text-[10px] font-medium rounded-lg border transition-colors ${
                          q === 'now' ? 'text-red-400 border-red-500/20 hover:bg-red-500/10' :
                          q === 'next' ? 'text-amber-400 border-amber-500/20 hover:bg-amber-500/10' :
                          'text-muted border-base hover:bg-surface'
                        }`}>
                        → {FOCUS_QUEUE_LABELS[q]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {addToQueue && (
        <TaskForm
          defaultFocusQueue={addToQueue}
          defaultDueDate={addToQueue === 'now' ? new Date().toISOString().split('T')[0] : undefined}
          defaultPriority={addToQueue === 'now' ? 'urgent' : 'high'}
          onSave={d => {
            addTask({ ...taskFormToEntity(d), focusQueue: addToQueue });
            setAddToQueue(null);
            toast(`Added to ${FOCUS_QUEUE_LABELS[addToQueue]}`);
          }}
          onClose={() => setAddToQueue(null)}
        />
      )}

      {pickForQueue && (
        <Modal title={`Add existing task to ${FOCUS_QUEUE_LABELS[pickForQueue]}`} onClose={() => setPickForQueue(null)} maxWidth="max-w-md">
          <ModalBody>
            {unassigned.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">All active tasks are already in a focus queue.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto os-scroll">
                {unassigned.map(task => (
                  <button key={task.id} onClick={() => { promote(task.id, pickForQueue); setPickForQueue(null); }}
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-raised rounded-lg truncate">
                    {task.title}
                  </button>
                ))}
              </div>
            )}
          </ModalBody>
        </Modal>
      )}
    </>
  );
}
