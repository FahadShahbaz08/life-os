'use client';

import { useState } from 'react';
import { Inbox, Plus, Trash2, ArrowRight, FileText, ListTodo } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import QuickCapture from '@/components/layout/QuickCapture';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import { INBOX_TYPES, BTN_PRIMARY } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import { InboxItem } from '@/types';

export default function InboxPage() {
  const { state, deleteInboxItem, processInboxToTask, processInboxToNote } = useApp();
  const { toast } = useToastContext();
  const [showCapture, setShowCapture] = useState(false);
  const [processing, setProcessing] = useState<InboxItem | null>(null);
  const [processAs, setProcessAs] = useState<'task' | 'note' | null>(null);

  const unprocessed = state.inboxItems.filter(i => !i.processed);
  const processed = state.inboxItems.filter(i => i.processed);

  const typeLabel = (type: string) => INBOX_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Life Inbox"
          subtitle={`${unprocessed.length} items to process · Brain dump everything here`}
          action={
            <button onClick={() => setShowCapture(true)} className={BTN_PRIMARY}>
              <Plus size={14} />Capture
            </button>
          }
        />

        {unprocessed.length === 0 ? (
          <EmptyState icon={Inbox} title="Inbox zero" description="Capture ideas, reminders, and thoughts before they slip away."
            action={<button onClick={() => setShowCapture(true)} className={BTN_PRIMARY}><Plus size={14} />Quick Capture</button>}
          />
        ) : (
          <div className="space-y-3 mb-8">
            {unprocessed.map(item => (
              <div key={item.id} className="bg-surface border border-base rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{typeLabel(item.type)}</span>
                    <p className="text-sm text-primary mt-2 leading-relaxed">{item.content}</p>
                    <p className="text-[11px] text-muted mt-2">{formatDateTime(item.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button onClick={() => { setProcessing(item); setProcessAs('task'); }} className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded-lg">
                      <ListTodo size={12} /> → Task
                    </button>
                    <button onClick={() => { setProcessing(item); setProcessAs('note'); }} className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded-lg">
                      <FileText size={12} /> → Note
                    </button>
                    <button onClick={() => { deleteInboxItem(item.id); toast('Deleted', 'info'); }} className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded-lg">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {processed.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Processed ({processed.length})</h2>
            <div className="space-y-2 opacity-60">
              {processed.slice(0, 10).map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-base text-sm text-muted">
                  <ArrowRight size={12} />
                  <span className="line-through flex-1 truncate">{item.content}</span>
                  <span className="text-[10px]">→ {item.convertedToType}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCapture && <QuickCapture onClose={() => setShowCapture(false)} />}

      {processing && processAs === 'task' && (
        <TaskForm
          task={{ title: processing.content.slice(0, 100), description: processing.content }}
          onSave={d => {
            processInboxToTask(processing.id, { ...taskFormToEntity(d), isTopPriority: false });
            setProcessing(null);
            setProcessAs(null);
            toast('Converted to task');
          }}
          onClose={() => { setProcessing(null); setProcessAs(null); }}
        />
      )}

      {processing && processAs === 'note' && (
        <NoteFromInbox item={processing} onClose={() => { setProcessing(null); setProcessAs(null); }} />
      )}
    </>
  );
}

function NoteFromInbox({ item, onClose }: { item: InboxItem; onClose: () => void }) {
  const { processInboxToNote } = useApp();
  const { toast } = useToastContext();
  const [title, setTitle] = useState(item.content.slice(0, 80));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-base rounded-2xl p-5 w-full max-w-md mx-4">
        <h3 className="font-semibold text-primary mb-3">Save as Note</h3>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl mb-3" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised rounded-xl">Cancel</button>
          <button onClick={() => {
            processInboxToNote(item.id, {
              areaId: null, title, content: item.content, summary: '', keyInsights: '',
              actionItems: '', references: '', category: 'ideas', tags: [],
              linkedProjectIds: [], linkedGoalIds: [], source: 'inbox', isPinned: false,
            });
            toast('Converted to note');
            onClose();
          }} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save Note</button>
        </div>
      </div>
    </div>
  );
}
