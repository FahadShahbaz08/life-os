'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Bell, Check } from 'lucide-react';
import { Reminder, Priority } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { PriorityBadge } from '@/components/ui/Badge';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY } from '@/lib/constants';
import { formatDateTime, PRIORITY_LABELS } from '@/lib/utils';

export default function RemindersPage() {
  const { state, addReminder, updateReminder, deleteReminder } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pending = state.reminders.filter(r => r.status === 'pending').sort((a, b) => a.remindAt.localeCompare(b.remindAt));
  const done = state.reminders.filter(r => r.status !== 'pending');

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Reminders" subtitle="Calls, payments, meetings, renewals"
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />Add Reminder</button>}
        />

        {state.reminders.length === 0 ? (
          <EmptyState icon={Bell} title="No reminders" description="Never forget a call, payment, or follow-up again."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add reminder</button>}
          />
        ) : (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-muted uppercase mb-3">Upcoming</h2>
              <div className="space-y-2">
                {pending.map(r => (
                  <div key={r.id} className="bg-surface border border-base rounded-2xl p-4 flex items-center gap-4">
                    <button onClick={() => { updateReminder(r.id, { status: 'dismissed' }); toast('Dismissed'); }}
                      className="w-8 h-8 rounded-lg border border-base flex items-center justify-center text-muted hover:text-emerald-500 hover:border-emerald-500/30">
                      <Check size={14} />
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{r.title}</p>
                      {r.description && <p className="text-xs text-muted">{r.description}</p>}
                      <p className="text-xs text-indigo-400 mt-1">{formatDateTime(r.remindAt)}</p>
                    </div>
                    <PriorityBadge priority={r.priority} />
                    <button onClick={() => setEditing(r)} className="p-1.5 text-muted hover:text-indigo-400"><Edit2 size={13} /></button>
                    <button onClick={() => setDeletingId(r.id)} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </section>
            {done.length > 0 && (
              <section className="opacity-60">
                <h2 className="text-xs font-semibold text-muted uppercase mb-3">Completed</h2>
                {done.slice(0, 5).map(r => (
                  <div key={r.id} className="px-4 py-2 text-sm text-muted line-through">{r.title}</div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <ReminderForm reminder={editing} onSave={d => {
          if (editing) { updateReminder(editing.id, d); toast('Updated'); }
          else { addReminder(d); toast('Reminder set'); }
          setShowForm(false); setEditing(null);
        }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
      {deletingId && <ConfirmDialog title="Delete?" message="" onConfirm={() => { deleteReminder(deletingId); setDeletingId(null); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function ReminderForm({ reminder, onSave, onClose }: { reminder: Reminder | null; onSave: (d: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(reminder?.title ?? '');
  const [description, setDescription] = useState(reminder?.description ?? '');
  const [remindAt, setRemindAt] = useState(reminder?.remindAt?.slice(0, 16) ?? '');
  const [priority, setPriority] = useState<Priority>(reminder?.priority ?? 'medium');

  return (
    <Modal title={reminder ? 'Edit Reminder' : 'New Reminder'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!title.trim() || !remindAt) return;
        onSave({ title: title.trim(), description, remindAt: new Date(remindAt).toISOString(), priority, recurrenceRule: null, linkedType: null, linkedId: null });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className={FORM_INPUT} required />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} className={`${FORM_INPUT} resize-none`} />
            <input type="datetime-local" value={remindAt} onChange={e => setRemindAt(e.target.value)} className={FORM_INPUT} required />
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={FORM_SELECT}>
              {(['low', 'medium', 'high', 'urgent'] as Priority[]).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
