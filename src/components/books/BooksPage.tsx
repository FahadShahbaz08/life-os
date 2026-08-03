'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, Trash2, Upload, Play, Clock, CheckCircle2,
  FileText, Highlighter, Loader2,
} from 'lucide-react';
import type { BookPublic, BookStatus } from '@/lib/books';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FORM_INPUT, BTN_PRIMARY, BTN_SECONDARY } from '@/lib/constants';

const STATUS_LABEL: Record<BookStatus, string> = {
  later: 'Read later',
  reading: 'Reading now',
  finished: 'Finished',
};

type Filter = 'all' | BookStatus;

export default function BooksPage() {
  const { toast } = useToastContext();
  const [books, setBooks] = useState<BookPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ book: BookPublic; mode: 'pdf' | 'pdf_and_notes' | 'all' } | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) throw new Error('load failed');
      setBooks(await res.json());
    } catch {
      toast('Failed to load books', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const filtered = books.filter(b => filter === 'all' || b.status === filter);

  const removeBook = async () => {
    if (!deleteTarget) return;
    const { book, mode } = deleteTarget;
    try {
      const res = await fetch(`/api/books/${book.id}?mode=${mode}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      const data = await res.json() as { book: BookPublic | null };
      if (mode === 'all' || !data.book) {
        setBooks(prev => prev.filter(b => b.id !== book.id));
      } else {
        setBooks(prev => prev.map(b => b.id === book.id ? data.book! : b));
      }
      toast(mode === 'all' ? 'Book removed' : mode === 'pdf' ? 'PDF removed' : 'PDF & notes removed');
    } catch {
      toast('Delete failed', 'error');
    }
    setDeleteTarget(null);
  };

  const uploadPdf = async (bookId: string, file: File) => {
    setUploadingId(bookId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/books/${bookId}/pdf`, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || 'Upload failed');
      }
      const updated = await res.json() as BookPublic;
      setBooks(prev => prev.map(b => b.id === bookId ? updated : b));
      toast('PDF uploaded & compressed');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted gap-2">
        <Loader2 size={18} className="animate-spin" /> Loading library…
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Reading"
          subtitle={`${books.length} books · resume, highlight, and annotate PDFs`}
          action={<button onClick={() => setShowAdd(true)} className={BTN_PRIMARY}><Plus size={14} />Add Book</button>}
        />

        <div className="flex flex-wrap gap-1.5 mb-6">
          {([
            ['all', 'All'],
            ['reading', 'Reading'],
            ['later', 'Later'],
            ['finished', 'Finished'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                filter === id ? 'bg-raised text-primary border-base' : 'border-transparent text-muted hover:text-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={books.length === 0 ? 'No books yet' : 'Nothing in this filter'}
            description="Add a book, choose Read now or Later, upload a PDF, then track progress and notes."
            action={books.length === 0 ? <button onClick={() => setShowAdd(true)} className={BTN_PRIMARY}>Add first book</button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(book => {
              const pct = book.totalPages && book.totalPages > 0
                ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
                : null;
              return (
                <div key={book.id} className="card p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <BookOpen size={16} className="text-muted shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-primary font-display truncate">{book.title}</h3>
                          {book.author && <p className="text-xs text-muted mt-0.5">{book.author}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <StatusBadge status={book.status} />
                        {book.hasPdf ? (
                          <span className="text-[10px] text-muted inline-flex items-center gap-1">
                            <FileText size={10} /> PDF
                            {book.pdfSizeBytes != null && book.pdfCompressedSize != null && (
                              <> · {formatBytes(book.pdfCompressedSize)} stored</>
                            )}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted">No PDF yet</span>
                        )}
                        {book.annotations.length > 0 && (
                          <span className="text-[10px] text-muted inline-flex items-center gap-1">
                            <Highlighter size={10} /> {book.annotations.length} notes
                          </span>
                        )}
                      </div>
                      {(book.status === 'reading' || book.currentPage > 1) && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[11px] text-muted mb-1">
                            <span>
                              Page {book.currentPage}
                              {book.totalPages ? ` / ${book.totalPages}` : ''}
                            </span>
                            {pct != null && <span>{pct}%</span>}
                          </div>
                          <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--chart-1)] rounded-full"
                              style={{ width: `${pct ?? Math.min(100, book.currentPage)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {book.hasPdf ? (
                        <Link href={`/books/${book.id}`} className={BTN_PRIMARY}>
                          <Play size={13} /> {book.currentPage > 1 ? 'Continue' : 'Open'}
                        </Link>
                      ) : (
                        <label className={`${BTN_PRIMARY} cursor-pointer ${uploadingId === book.id ? 'opacity-50 pointer-events-none' : ''}`}>
                          {uploadingId === book.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                          Upload PDF
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) void uploadPdf(book.id, f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                      <DeleteMenu
                        hasPdf={book.hasPdf}
                        onPick={mode => setDeleteTarget({ book, mode })}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddBookModal
          onClose={() => setShowAdd(false)}
          onCreated={async (book, file) => {
            setBooks(prev => [book, ...prev]);
            setShowAdd(false);
            toast('Book added');
            if (file) await uploadPdf(book.id, file);
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={
            deleteTarget.mode === 'all'
              ? 'Delete entire book?'
              : deleteTarget.mode === 'pdf_and_notes'
                ? 'Delete PDF and notes?'
                : 'Delete PDF only?'
          }
          message={
            deleteTarget.mode === 'all'
              ? `“${deleteTarget.book.title}” and its PDF + annotations will be permanently removed.`
              : deleteTarget.mode === 'pdf_and_notes'
                ? 'The PDF and all highlights/notes will be removed. Book entry stays.'
                : 'Only the PDF file is removed. Annotations and book entry stay.'
          }
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => void removeBook()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: BookStatus }) {
  const Icon = status === 'reading' ? Play : status === 'finished' ? CheckCircle2 : Clock;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-raised border border-base text-secondary">
      <Icon size={10} /> {STATUS_LABEL[status]}
    </span>
  );
}

function DeleteMenu({
  hasPdf, onPick,
}: {
  hasPdf: boolean;
  onPick: (mode: 'pdf' | 'pdf_and_notes' | 'all') => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="p-2 text-muted hover:text-red-400 rounded-lg border border-base"
        title="Delete options"
      >
        <Trash2 size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-52 card p-1 shadow-xl panel-in">
            {hasPdf && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-raised rounded-md"
                onClick={() => { setOpen(false); onPick('pdf'); }}
              >
                Delete PDF only
              </button>
            )}
            {hasPdf && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-raised rounded-md"
                onClick={() => { setOpen(false); onPick('pdf_and_notes'); }}
              >
                Delete PDF + notes
              </button>
            )}
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-raised rounded-md"
              onClick={() => { setOpen(false); onPick('all'); }}
            >
              Delete entire book
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function AddBookModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (book: BookPublic, file: File | null) => void | Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('1');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToastContext();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          status: when === 'now' ? 'reading' : 'later',
          totalPages: totalPages ? Number(totalPages) : null,
          currentPage: when === 'now' && currentPage ? Number(currentPage) : 1,
        }),
      });
      if (!res.ok) throw new Error('create failed');
      const book = await res.json() as BookPublic;
      await onCreated(book, file);
    } catch {
      toast('Could not create book', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Book" onClose={onClose}>
      <form onSubmit={e => void submit(e)} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Book title *" className={FORM_INPUT} required autoFocus />
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author (optional)" className={FORM_INPUT} />
            <div>
              <p className="text-xs font-medium text-secondary mb-1.5">When will you read it?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWhen('now')}
                  className={`px-3 py-2.5 text-sm rounded-lg border text-left ${when === 'now' ? 'border-base bg-raised text-primary' : 'border-base text-muted'}`}
                >
                  <Play size={14} className="inline mr-1.5" /> Start now
                </button>
                <button
                  type="button"
                  onClick={() => setWhen('later')}
                  className={`px-3 py-2.5 text-sm rounded-lg border text-left ${when === 'later' ? 'border-base bg-raised text-primary' : 'border-base text-muted'}`}
                >
                  <Clock size={14} className="inline mr-1.5" /> Read later
                </button>
              </div>
            </div>
            {when === 'now' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted mb-1 block">Total pages</label>
                  <input type="number" min={1} value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="e.g. 320" className={FORM_INPUT} />
                </div>
                <div>
                  <label className="text-[11px] text-muted mb-1 block">Start at page</label>
                  <input type="number" min={1} value={currentPage} onChange={e => setCurrentPage(e.target.value)} className={FORM_INPUT} />
                </div>
              </div>
            )}
            {when === 'later' && (
              <div>
                <label className="text-[11px] text-muted mb-1 block">Total pages (optional)</label>
                <input type="number" min={1} value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="e.g. 320" className={FORM_INPUT} />
              </div>
            )}
            <div>
              <label className="text-[11px] text-muted mb-1 block">PDF (optional — under 20MB)</label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-raised file:text-primary"
              />
              {file && <p className="text-[11px] text-muted mt-1">{file.name} · {formatBytes(file.size)}</p>}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className={BTN_SECONDARY + ' flex-1'}>Cancel</button>
          <button type="submit" disabled={saving || !title.trim()} className={`${BTN_PRIMARY} flex-1 justify-center`}>
            {saving ? 'Saving…' : 'Add book'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
