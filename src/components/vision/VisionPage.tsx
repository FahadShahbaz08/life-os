'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Telescope } from 'lucide-react';
import { VisionItem, VisionType } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FORM_INPUT, BTN_PRIMARY } from '@/lib/constants';

const VISION_SECTIONS: { type: VisionType; label: string; description: string }[] = [
  { type: 'one_year', label: '1-Year Goals', description: 'What you want to achieve this year' },
  { type: 'three_year', label: '3-Year Goals', description: 'Medium-term direction' },
  { type: 'five_year', label: '5-Year Goals', description: 'Long-term vision' },
  { type: 'bucket_list', label: 'Bucket List', description: 'Experiences and achievements' },
  { type: 'dream_project', label: 'Dream Projects', description: 'Ambitious projects to build' },
];

export default function VisionPage() {
  const { state, addVisionItem, updateVisionItem, deleteVisionItem } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState<VisionType | null>(null);
  const [editing, setEditing] = useState<VisionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Life Vision" subtitle="Connect daily actions with long-term direction" />

        {state.visionItems.length === 0 && (
          <EmptyState icon={Telescope} title="Define your vision" description="Set 1-year, 3-year, and 5-year goals. Add bucket list items and dream projects."
            action={<button onClick={() => setShowForm('one_year')} className={BTN_PRIMARY}>Start with 1-year goals</button>}
          />
        )}

        <div className="space-y-8">
          {VISION_SECTIONS.map(section => {
            const items = state.visionItems.filter(v => v.type === section.type).sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <section key={section.type} className="bg-surface border border-base rounded-2xl p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-primary">{section.label}</h2>
                  <button onClick={() => setShowForm(section.type)} className="p-1.5 text-muted hover:text-indigo-400 rounded-lg"><Plus size={14} /></button>
                </div>
                <p className="text-xs text-muted mb-4">{section.description}</p>
                {items.length === 0 ? (
                  <p className="text-xs text-muted italic">Nothing here yet</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-start justify-between gap-3 p-3 bg-raised rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-primary">{item.title}</p>
                          {item.description && <p className="text-xs text-muted mt-0.5">{item.description}</p>}
                          {item.targetYear && <p className="text-[10px] text-indigo-400 mt-1">Target: {item.targetYear}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setEditing(item)} className="p-1 text-muted hover:text-indigo-400"><Edit2 size={12} /></button>
                          <button onClick={() => setDeletingId(item.id)} className="p-1 text-muted hover:text-red-400"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {(showForm || editing) && (
        <VisionForm type={editing?.type ?? showForm!} item={editing} onSave={d => {
          if (editing) { updateVisionItem(editing.id, d); toast('Updated'); }
          else { addVisionItem(d); toast('Added'); }
          setShowForm(null); setEditing(null);
        }} onClose={() => { setShowForm(null); setEditing(null); }} />
      )}
      {deletingId && <ConfirmDialog title="Delete?" message="" onConfirm={() => { deleteVisionItem(deletingId); setDeletingId(null); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function VisionForm({ type, item, onSave, onClose }: { type: VisionType; item: VisionItem | null; onSave: (d: Omit<VisionItem, 'id' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [targetYear, setTargetYear] = useState(item?.targetYear?.toString() ?? '');

  return (
    <Modal title={item ? 'Edit' : 'Add Vision Item'} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (!title.trim()) return;
        onSave({ type, title: title.trim(), description, targetYear: targetYear ? Number(targetYear) : null, sortOrder: item?.sortOrder ?? 0, linkedGoalId: item?.linkedGoalId ?? null });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className={FORM_INPUT} required />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={3} className={`${FORM_INPUT} resize-none`} />
            <input type="number" value={targetYear} onChange={e => setTargetYear(e.target.value)} placeholder="Target year" className={FORM_INPUT} />
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
