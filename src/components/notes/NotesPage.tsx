'use client';

import { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, FileText, Search, Pin, Image as ImageIcon, Link2 } from 'lucide-react';
import { Note, NoteCategory } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, BTN_TAB_ACTIVE, BTN_TAB_IDLE, NOTE_CATEGORIES } from '@/lib/constants';
import { formatDate, normalizeTags } from '@/lib/utils';

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
}

function extractImages(html: string): string[] {
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
  return [...matches].map(m => m[1]);
}

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
      if (!q) return true;
      const body = stripHtml(n.content).toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        body.includes(q) ||
        n.tags.some(t => t.includes(q)) ||
        (n.summary || '').toLowerCase().includes(q)
      );
    });
  }, [state.notes, search, category]);

  const pinned = filtered.filter(n => n.isPinned);
  const rest = filtered.filter(n => !n.isPinned);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Notes" subtitle={`${state.notes.length} notes · knowledge base with rich text & images`}
          action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}><Plus size={14} />New Note</button>}
        />

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" className="w-full pl-8 pr-3 py-2.5 text-sm bg-surface border border-base rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/35" />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          <button onClick={() => setCategory('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${category === 'all' ? BTN_TAB_ACTIVE : BTN_TAB_IDLE}`}>All</button>
          {NOTE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${category === c.value ? BTN_TAB_ACTIVE : BTN_TAB_IDLE}`}>{c.label}</button>
          ))}
        </div>

        {state.notes.length === 0 ? (
          <EmptyState icon={FileText} title="No notes yet" description="Capture ideas with formatting, links, and images."
            action={<button onClick={() => setShowForm(true)} className={BTN_PRIMARY}>Create first note</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...pinned, ...rest].map(note => {
              const preview = stripHtml(note.content || note.summary).slice(0, 140);
              const cover = (note.imageUrls?.[0]) || extractImages(note.content)[0];
              return (
                <div
                  key={note.id}
                  className="card overflow-hidden hover:border-accent cursor-pointer transition-colors group"
                  onClick={() => setViewing(note)}
                >
                  {cover && (
                    <div className="h-28 bg-raised overflow-hidden border-b border-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.isPinned && <Pin size={12} className="text-amber-400 shrink-0" />}
                        <h3 className="text-sm font-semibold font-display text-primary truncate">{note.title}</h3>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditing(note)} className="p-1.5 text-muted hover:text-accent rounded-lg"><Edit2 size={13} /></button>
                        <button onClick={() => setDeletingId(note.id)} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <p className="text-xs text-muted mt-1.5 line-clamp-3 min-h-[2.5rem]">{preview || 'Empty note'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised text-muted">{note.category.replace('_', ' ')}</span>
                      {note.tags.slice(0, 2).map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-accent-subtle text-accent">#{t}</span>)}
                      {(cover || note.references) && (
                        <span className="text-[10px] text-muted inline-flex items-center gap-0.5 ml-auto">
                          {cover ? <ImageIcon size={10} /> : <Link2 size={10} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

      {viewing && (
        <NoteDetail
          note={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title="Delete note?"
          message="This cannot be undone."
          onConfirm={() => { deleteNote(deletingId); setDeletingId(null); toast('Deleted', 'info'); }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  );
}

function NoteForm({ note, onSave, onClose }: {
  note: Note | null;
  onSave: (d: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [category, setCategory] = useState<NoteCategory>(note?.category ?? 'general');
  const [tags, setTags] = useState(note?.tags.join(', ') ?? '');
  const [source, setSource] = useState(note?.source ?? '');
  const [references, setReferences] = useState(note?.references ?? '');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(note?.imageUrls ?? []);
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);

  const addImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    if (!imageUrls.includes(url)) setImageUrls(prev => [...prev, url]);
    // Also insert into rich content so it shows in the body
    setContent(prev => `${prev}<p><img src="${url}" alt="" /></p>`);
    setImageUrlInput('');
  };

  return (
    <Modal title={note ? 'Edit Note' : 'New Note'} onClose={onClose} maxWidth="max-w-3xl">
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!title.trim()) return;
          const imgs = [...new Set([...imageUrls, ...extractImages(content)])];
          onSave({
            areaId: note?.areaId ?? null,
            title: title.trim(),
            content,
            summary: stripHtml(content).slice(0, 200),
            keyInsights: note?.keyInsights ?? '',
            actionItems: note?.actionItems ?? '',
            references,
            imageUrls: imgs,
            category,
            tags: normalizeTags(tags.split(',')),
            linkedProjectIds: note?.linkedProjectIds ?? [],
            linkedGoalIds: note?.linkedGoalIds ?? [],
            source,
            isPinned,
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className={FORM_INPUT} required />
            <div className="grid grid-cols-2 gap-3">
              <select value={category} onChange={e => setCategory(e.target.value as NoteCategory)} className={FORM_SELECT}>
                {NOTE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)" className={FORM_INPUT} />
            </div>
            <RichTextEditor value={content} onChange={setContent} placeholder="Write with bold, lists, links, images…" minHeight={220} />
            <div className="flex gap-2">
              <input
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
                placeholder="Paste image URL and add"
                className={FORM_INPUT}
              />
              <button type="button" onClick={addImageUrl} className="px-3 py-2 text-sm text-accent bg-accent-subtle border border-accent rounded-xl whitespace-nowrap">
                + Image
              </button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map(url => (
                  <div key={url} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-base" />
                    <button
                      type="button"
                      onClick={() => setImageUrls(prev => prev.filter(u => u !== url))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input value={references} onChange={e => setReferences(e.target.value)} placeholder="Reference links (docs, articles…)" className={FORM_INPUT} />
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source (book, article…)" className={FORM_INPUT} />
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} /> Pin note
            </label>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className={`flex-1 py-2 text-sm ${BTN_PRIMARY}`}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function NoteDetail({ note, onClose, onEdit }: { note: Note; onClose: () => void; onEdit: () => void }) {
  const images = [...new Set([...(note.imageUrls ?? []), ...extractImages(note.content)])];

  return (
    <Modal title={note.title} onClose={onClose} maxWidth="max-w-3xl">
      <ModalBody>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md bg-raised text-muted">{note.category.replace('_', ' ')}</span>
            {note.tags.map(t => <span key={t} className="text-xs text-accent">#{t}</span>)}
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map(url => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="rounded-xl border border-base object-cover w-full h-28" />
              ))}
            </div>
          )}
          {note.content && (
            <div className="rt-content text-secondary" dangerouslySetInnerHTML={{ __html: note.content }} />
          )}
          {note.references && (
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase mb-1">References</h4>
              <p className="text-secondary break-all">{note.references}</p>
            </div>
          )}
          {note.source && <p className="text-xs text-muted">Source: {note.source}</p>}
          <p className="text-xs text-muted">Updated {formatDate(note.updatedAt)}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onEdit} className={`flex-1 ${BTN_PRIMARY}`}>Edit</button>
        <button onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-lg">Close</button>
      </ModalFooter>
    </Modal>
  );
}
