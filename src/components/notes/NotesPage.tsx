'use client';

import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, FileText, Search, Pin } from 'lucide-react';
import { Note, NoteCategory } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, NOTE_CATEGORIES } from '@/lib/constants';
import { formatDate, normalizeTags } from '@/lib/utils';

export default function NotesPage() {
  const { state, addNote, updateNote, deleteNote } = useApp();
  const { toast } = useToastContext();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [viewing, setViewing] = useState<Note | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.notes.filter(n => {
      if (category !== 'all' && n.category !== category) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.content.toLowerCase().includes(q) && !n.tags.some(t => t.includes(q))) return false;
      return true;
    });
  }, [state.notes, search, category]);

  const pinned = filtered.filter(n => n.isPinned);
  const rest = filtered.filter(n => !n.isPinned);

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Knowledge Base" subtitle={`${state.notes.length} notes · Your second brain`}
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />New Note</button>}
        />

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="w-full pl-8 pr-3 py-2 text-sm bg-surface border border-base rounded-xl" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          <button onClick={() => setCategory('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${category === 'all' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-raised text-muted border border-base'}`}>All</button>
          {NOTE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)} className={`px-2.5 py-1 rounded-lg text-xs font-medium ${category === c.value ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-raised text-muted border border-base'}`}>{c.label}</button>
          ))}
        </div>

        {state.notes.length === 0 ? (
          <EmptyState icon={FileText} title="No notes yet" description="Build your knowledge base — trading insights, book notes, game dev learnings."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Create first note</button>}
          />
        ) : (
          <div className="space-y-3">
            {[...pinned, ...rest].map(note => (
              <div key={note.id} className="bg-surface border border-base rounded-2xl p-4 hover:border-indigo-500/20 cursor-pointer" onClick={() => setViewing(note)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {note.isPinned && <Pin size={12} className="text-amber-400" />}
                      <h3 className="text-sm font-semibold text-primary">{note.title}</h3>
                    </div>
                    <p className="text-xs text-muted mt-1 line-clamp-2">{note.content || note.summary}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised text-muted">{note.category}</span>
                      {note.tags.slice(0, 3).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400">#{t}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setEditing(note)} className="p-1.5 text-muted hover:text-indigo-400 rounded-lg"><Edit2 size={13} /></button>
                    <button onClick={() => setDeletingId(note.id)} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showForm || editing) && (
        <NoteForm note={editing} onSave={d => {
          if (editing) { updateNote(editing.id, d); toast('Note updated'); }
          else { addNote(d); toast('Note created'); }
          setShowForm(false); setEditing(null);
        }} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}

      {viewing && <NoteDetail note={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }} />}

      {deletingId && <ConfirmDialog title="Delete note?" message="This cannot be undone." onConfirm={() => { deleteNote(deletingId); setDeletingId(null); toast('Deleted', 'info'); }} onCancel={() => setDeletingId(null)} />}
    </>
  );
}

function NoteForm({ note, onSave, onClose }: { note: Note | null; onSave: (d: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [summary, setSummary] = useState(note?.summary ?? '');
  const [keyInsights, setKeyInsights] = useState(note?.keyInsights ?? '');
  const [actionItems, setActionItems] = useState(note?.actionItems ?? '');
  const [references, setReferences] = useState(note?.references ?? '');
  const [category, setCategory] = useState<NoteCategory>(note?.category ?? 'general');
  const [tags, setTags] = useState(note?.tags.join(', ') ?? '');
  const [source, setSource] = useState(note?.source ?? '');
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);

  const handleSave = (d: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    onSave(d);
  };

  return (
    <Modal title={note ? 'Edit Note' : 'New Note'} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={e => { e.preventDefault(); if (!title.trim()) return;
        handleSave({ areaId: note?.areaId ?? null, title: title.trim(), content, summary, keyInsights, actionItems, references,
          category, tags: normalizeTags(tags.split(',')), linkedProjectIds: note?.linkedProjectIds ?? [], linkedGoalIds: note?.linkedGoalIds ?? [], source, isPinned });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className={FORM_INPUT} required />
            <select value={category} onChange={e => setCategory(e.target.value as NoteCategory)} className={FORM_SELECT}>
              {NOTE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Content" rows={5} className={`${FORM_INPUT} resize-none`} />
            <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Summary" rows={2} className={`${FORM_INPUT} resize-none`} />
            <textarea value={keyInsights} onChange={e => setKeyInsights(e.target.value)} placeholder="Key insights" rows={2} className={`${FORM_INPUT} resize-none`} />
            <textarea value={actionItems} onChange={e => setActionItems(e.target.value)} placeholder="Action items" rows={2} className={`${FORM_INPUT} resize-none`} />
            <input value={references} onChange={e => setReferences(e.target.value)} placeholder="References / links" className={FORM_INPUT} />
            <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)" className={FORM_INPUT} />
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source (book, article…)" className={FORM_INPUT} />
            <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} /> Pin note</label>
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

function NoteDetail({ note, onClose, onEdit }: { note: Note; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal title={note.title} onClose={onClose} maxWidth="max-w-2xl">
      <ModalBody>
        <div className="space-y-4 text-sm">
          <div className="flex gap-2"><span className="text-xs px-2 py-0.5 rounded-md bg-raised text-muted">{note.category}</span>{note.tags.map(t => <span key={t} className="text-xs text-indigo-400">#{t}</span>)}</div>
          {note.content && <div><h4 className="text-xs font-semibold text-muted uppercase mb-1">Content</h4><p className="text-secondary whitespace-pre-line">{note.content}</p></div>}
          {note.summary && <div><h4 className="text-xs font-semibold text-muted uppercase mb-1">Summary</h4><p className="text-secondary whitespace-pre-line">{note.summary}</p></div>}
          {note.keyInsights && <div><h4 className="text-xs font-semibold text-muted uppercase mb-1">Key Insights</h4><p className="text-secondary whitespace-pre-line">{note.keyInsights}</p></div>}
          {note.actionItems && <div><h4 className="text-xs font-semibold text-muted uppercase mb-1">Action Items</h4><p className="text-secondary whitespace-pre-line">{note.actionItems}</p></div>}
          {note.references && <div><h4 className="text-xs font-semibold text-muted uppercase mb-1">References</h4><p className="text-secondary">{note.references}</p></div>}
          <p className="text-xs text-muted">Updated {formatDate(note.updatedAt)}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onEdit} className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Edit</button>
        <button onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Close</button>
      </ModalFooter>
    </Modal>
  );
}
