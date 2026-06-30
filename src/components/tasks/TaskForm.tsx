'use client';

import { useState } from 'react';
import { Priority, TaskStatus, FocusQueue } from '@/types';
import { PRIORITY_LABELS, TASK_STATUS_LABELS, FOCUS_QUEUE_LABELS, todayISO } from '@/lib/utils';
import { FORM_INPUT, FORM_SELECT, FOLLOW_UP_INTERVALS } from '@/lib/constants';
import { buildTaskReminderAt } from '@/lib/utils';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  dueTime: string | null;
  followUpIntervalMinutes: number | null;
  focusQueue: FocusQueue | null;
  areaId: string | null;
  projectId: string | null;
  tags: string[];
  progressNotes: string;
  isRecurring: boolean;
  isTopPriority: boolean;
}

interface Props {
  task?: Partial<TaskFormData> & { id?: string };
  defaultProjectId?: string | null;
  defaultAreaId?: string | null;
  defaultDueDate?: string;
  defaultFocusQueue?: FocusQueue;
  defaultPriority?: Priority;
  defaultTopPriority?: boolean;
  onSave: (data: TaskFormData) => void;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'urgent'];
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'waiting', 'completed', 'archived'];
const FOCUS_QUEUES: (FocusQueue | '')[] = ['', 'now', 'next', 'later'];

export default function TaskForm({ task, defaultProjectId, defaultAreaId, defaultDueDate, defaultFocusQueue, defaultPriority, defaultTopPriority, onSave, onClose }: Props) {
  const { state } = useApp();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? defaultPriority ?? 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? '');
  const [dueTime, setDueTime] = useState(task?.dueTime ?? '');
  const [followUpIntervalMinutes, setFollowUpIntervalMinutes] = useState<number | null>(
    task?.followUpIntervalMinutes ?? state.settings.defaultFollowUpIntervalMinutes ?? null
  );
  const [focusQueue, setFocusQueue] = useState<FocusQueue | ''>(task?.focusQueue ?? defaultFocusQueue ?? '');
  const [areaId, setAreaId] = useState(task?.areaId ?? defaultAreaId ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId ?? '');
  const [tags, setTags] = useState(task?.tags?.join(', ') ?? '');
  const [progressNotes, setProgressNotes] = useState(task?.progressNotes ?? '');
  const [isRecurring, setIsRecurring] = useState(task?.isRecurring ?? false);
  const [isTopPriority, setIsTopPriority] = useState(task?.isTopPriority ?? defaultTopPriority ?? false);

  const activeProjects = state.projects.filter(p => p.status !== 'archived');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      followUpIntervalMinutes,
      focusQueue: focusQueue || null,
      areaId: areaId || null,
      projectId: projectId || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      progressNotes: progressNotes.trim(),
      isRecurring,
      isTopPriority,
    });
  };

  return (
    <Modal title={task?.id ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={FORM_INPUT} autoFocus required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={`${FORM_INPUT} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className={FORM_SELECT}>
                  {STATUSES.map(s => <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={FORM_SELECT}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Project</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)} className={FORM_SELECT}>
                <option value="">None</option>
                {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={FORM_INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Due Time</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className={FORM_INPUT}
                  disabled={!dueDate}
                />
              </div>
            </div>
            {dueDate && (
              <p className="text-[11px] text-muted -mt-2">
                Set a due time for a timed Google Calendar event and notification at that hour.
                {!dueTime && ' Without a time, the calendar entry is all-day only.'}
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Follow-up if not done</label>
              <select
                value={followUpIntervalMinutes ?? ''}
                onChange={e => setFollowUpIntervalMinutes(e.target.value ? Number(e.target.value) : null)}
                className={FORM_SELECT}
                disabled={!dueDate}
              >
                {FOLLOW_UP_INTERVALS.map(opt => (
                  <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1.5">
                Life OS browser alerts repeat on this interval after the due time until you mark the task done.
                Enable alerts from the Today page.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Focus Queue</label>
              <select value={focusQueue} onChange={e => setFocusQueue(e.target.value as FocusQueue | '')} className={FORM_SELECT}>
                {FOCUS_QUEUES.map(q => <option key={q || 'none'} value={q}>{q ? FOCUS_QUEUE_LABELS[q] : 'None'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Tags (comma-separated)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="work, urgent" className={FORM_INPUT} />
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded" />
              Recurring task
            </label>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={isTopPriority} onChange={e => setIsTopPriority(e.target.checked)} className="rounded" />
              Pin as Top Priority (shows on Today dashboard)
            </label>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Progress Notes</label>
              <textarea value={progressNotes} onChange={e => setProgressNotes(e.target.value)} rows={2} className={`${FORM_INPUT} resize-none`} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-secondary bg-raised hover:bg-base border border-base rounded-xl">Cancel</button>
          <button type="submit" disabled={!title.trim()} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40">
            {task?.id ? 'Save' : 'Add Task'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export function taskFormToEntity(data: TaskFormData) {
  return {
    ...data,
    reminderAt: buildTaskReminderAt(data.dueDate, data.dueTime),
    recurrenceRule: null,
    isTopPriority: data.isTopPriority,
  };
}
