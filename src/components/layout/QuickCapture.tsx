'use client';

import { useState } from 'react';
import { InboxType } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import { INBOX_TYPES, FORM_INPUT, FORM_SELECT } from '@/lib/constants';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';

interface Props { onClose: () => void; }

export default function QuickCapture({ onClose }: Props) {
  const { addInboxItem } = useApp();
  const { toast } = useToastContext();
  const [content, setContent] = useState('');
  const [type, setType] = useState<InboxType>('thought');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addInboxItem({ content: content.trim(), type });
    toast('Captured to inbox');
    onClose();
  };

  return (
    <Modal title="Quick Capture" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <p className="text-xs text-muted mb-3">Brain dump anything — organize it later from your Inbox.</p>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What's on your mind?" rows={4} className={`${FORM_INPUT} resize-none mb-3`} autoFocus />
          <label className="block text-xs font-medium text-secondary mb-1.5">Type</label>
          <select value={type} onChange={e => setType(e.target.value as InboxType)} className={FORM_SELECT}>
            {INBOX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" disabled={!content.trim()} className="flex-1 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-40">Capture</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
