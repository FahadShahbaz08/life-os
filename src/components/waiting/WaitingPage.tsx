'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, User } from 'lucide-react';
import { WaitingFor, WaitingStatus } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/Badge';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

const STATUS_COLORS: Record<WaitingStatus, string> = {
  waiting: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  follow_up_needed: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const STATUS_LABELS: Record<WaitingStatus, string> = {
  waiting: 'Waiting', follow_up_needed: 'Follow Up Needed', completed: 'Completed',
};

export default function WaitingPage() {
  const { state, addWaitingFor, updateWaitingFor, deleteWaitingFor } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WaitingFor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const active = state.waitingFor.filter(w => w.status !== 'completed');
  const completed = state.waitingFor.filter(w => w.status === 'completed');

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Waiting For" subtitle="Track things that depend on other people"
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />Add Item</button>}
        />

        {state.waitingFor.length === 0 ? (
          <EmptyState icon={Clock} title="Nothing waiting" description="Track client responses, payments, approvals, bank verifications."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Add first item</button>}
          />
        ) : (
          <div className="space-y-3">
            {active.map(w => (
              <div key={w.id} className={`bg-surface border rounded-2xl p-4 ${w.status === 'follow_up_needed' ? 'border-red-500/30' : 'border-base'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-primary">{w.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                      <User size={11} />{w.person || 'Unknown'}
                      {w.followUpDate && <span>· Follow up {formatDate(w.followUpDate)}</span>}
                    </div>
                    {w.description && <p className="text-xs text-secondary mt-2">{w.description}</p>}
                  </div>
                  <StatusBadge label={STATUS_LABELS[w.status]} colorClass={STATUS_COLORS[w.status]} />
                </div>
                <div className="flex gap-2 mt-3">
                  {w.status !== 'completed' && (
                    <>
                      <button onClick={() => { updateWaitingFor(w.id, { status: 'follow_up_needed' }); toast('Marked follow-up needed'); }}
                        className="px-2 py-1 text-xs text-amber-400 bg-amber-500/10 rounded-lg">Need Follow-up</button>
                      <button onClick={() => { updateWaitingFor(w.id, { status: 'completed', completedAt: new Date().toISOString() }); toast('Completed'); }}
                        className="px-2 py-1 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg">Complete</button>
                    </>
                  )}
                  <button onClick={() => setEditing(w)} className="p-1 text-muted hover:text-indigo-400 ml-auto"><Edit2 size={13} /></button>
                  <button onClick={() => setDeletingId(w.id)} className="p-1 text-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
            {completed.length > 0 && (
              <div className="opacity-50 mt-6">
                <h2 className="text-xs text-muted uppercase mb-2">Completed ({completed.length})</h2>
                {completed.slice(0, 5).map(w => <p key={w.id} className="text-sm text-muted line-through py-1">{w.title}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <WaitingForm item={editing} onSave={d => {
          if (editing) { updateWaitingFor(editing.id, d); toast('Updated'); }
          else { addWaitingFor(d); toast('Added'); }
          setShowForm(false); setEditing(null);
        }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
      {deletingId && <ConfirmDialog title="Delete?" message="" onConfirm={() => { deleteWaitingFor(deletingId); setDeletingId(null); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function WaitingForm({ item, onSave, onClose }: { item: WaitingFor | null; onSave: (d: Omit<WaitingFor, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => void; onClose: () => void }) {
  const { state } = useApp();
  const [title, setTitle] = useState(item?.title ?? '');
  const [person, setPerson] = useState(item?.person ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [status, setStatus] = useState<WaitingStatus>(item?.status ?? 'waiting');
  const [followUpDate, setFollowUpDate] = useState(item?.followUpDate ?? '');
  const [areaId, setAreaId] = useState(item?.areaId ?? '');
  const [projectId, setProjectId] = useState(item?.projectId ?? '');

  return (
    <Modal title={item ? 'Edit' : 'New Waiting For'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!title.trim()) return;
        onSave({ title: title.trim(), person, description, status, followUpDate: followUpDate || null, areaId: areaId || null, projectId: projectId || null });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you waiting for? *" className={FORM_INPUT} required />
            <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Person / company" className={FORM_INPUT} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details" rows={2} className={`${FORM_INPUT} resize-none`} />
            <select value={status} onChange={e => setStatus(e.target.value as WaitingStatus)} className={FORM_SELECT}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className={FORM_INPUT} />
            <select value={areaId} onChange={e => setAreaId(e.target.value)} className={FORM_SELECT}>
              <option value="">No area</option>
              {state.areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={FORM_SELECT}>
              <option value="">No project</option>
              {state.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
