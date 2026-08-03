'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Highlighter, StickyNote, Trash2, Loader2, BookOpen, List,
} from 'lucide-react';
import type { AnnotationType, BookAnnotation, BookPublic } from '@/lib/books';
import { useToastContext } from '@/context/ToastContext';
import { FORM_INPUT, BTN_PRIMARY, BTN_SECONDARY } from '@/lib/constants';

interface Props {
  bookId: string;
}

export default function BookReader({ bookId }: Props) {
  const { toast } = useToastContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [book, setBook] = useState<BookPublic | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const saveProgress = useCallback(async (pageNum: number, total?: number) => {
    try {
      const body: Record<string, unknown> = {
        currentPage: pageNum,
        lastOpenedAt: new Date().toISOString(),
        status: 'reading',
      };
      if (total) body.totalPages = total;
      const res = await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) setBook(await res.json());
    } catch {
      // best-effort progress save
    }
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const metaRes = await fetch(`/api/books/${bookId}`);
        if (!metaRes.ok) throw new Error('Book not found');
        const meta = (await metaRes.json()) as BookPublic;
        if (cancelled) return;
        setBook(meta);
        if (!meta.hasPdf) {
          setLoading(false);
          return;
        }

        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

        const pdfRes = await fetch(`/api/books/${bookId}/pdf`);
        if (!pdfRes.ok) throw new Error('PDF missing');
        const data = new Uint8Array(await pdfRes.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void doc.destroy();
          return;
        }
        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        const startPage = Math.min(Math.max(1, meta.currentPage || 1), doc.numPages);
        setPage(startPage);
        void saveProgress(startPage, doc.numPages);
      } catch (e) {
        console.error(e);
        toast('Could not open book', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      void pdfDocRef.current?.destroy();
      pdfDocRef.current = null;
    };
  }, [bookId, toast, saveProgress]);

  const renderPage = useCallback(async (pageNum: number) => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!doc || !canvas) return;

    renderTaskRef.current?.cancel();
    setRendering(true);
    try {
      const pdfPage = await doc.getPage(pageNum);
      const containerWidth = containerRef.current?.clientWidth ?? 720;
      const unscaled = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1.8, Math.max(0.8, (containerWidth - 32) / unscaled.width));
      const viewport = pdfPage.getViewport({ scale });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const task = pdfPage.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;

      if (textLayerDiv) {
        textLayerDiv.innerHTML = '';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        const textContent = await pdfPage.getTextContent();
        for (const item of textContent.items) {
          if (!('str' in item) || !item.str) continue;
          const transform = item.transform;
          const fontHeight =
            Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]) * scale;
          const left = transform[4] * scale;
          const top = viewport.height - transform[5] * scale - fontHeight;
          const span = document.createElement('span');
          span.textContent = `${item.str} `;
          span.style.cssText = [
            'position:absolute',
            `left:${left}px`,
            `top:${top}px`,
            `font-size:${Math.max(8, fontHeight)}px`,
            'font-family:sans-serif',
            'color:transparent',
            'white-space:pre',
            'line-height:1',
            'transform-origin:0 0',
            'cursor:text',
          ].join(';');
          textLayerDiv.appendChild(span);
        }
      }
    } catch (e) {
      if ((e as { name?: string })?.name !== 'RenderingCancelledException') {
        console.error(e);
      }
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (numPages > 0 && page >= 1) void renderPage(page);
  }, [page, numPages, renderPage]);

  const goTo = (p: number) => {
    if (p < 1 || (numPages && p > numPages)) return;
    setPage(p);
    void saveProgress(p, numPages || undefined);
  };

  const captureSelection = () => {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (sel) setSelectedText(sel);
  };

  const addAnnotation = async (type: AnnotationType) => {
    if (!noteText.trim() && !selectedText.trim()) {
      toast('Add a note or select text first', 'error');
      return;
    }
    setSavingNote(true);
    try {
      const res = await fetch(`/api/books/${bookId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page,
          type,
          selectedText,
          note: noteText,
          color: type === 'highlight' ? '#facc15' : '#93c5fd',
        }),
      });
      if (!res.ok) throw new Error('save failed');
      setBook(await res.json());
      setNoteText('');
      setSelectedText('');
      toast('Saved');
    } catch {
      toast('Could not save note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const removeAnnotation = async (annotationId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/annotations?annotationId=${annotationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('delete failed');
      setBook(await res.json());
    } catch {
      toast('Could not delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-muted gap-2">
        <Loader2 className="animate-spin" size={18} /> Opening book…
      </div>
    );
  }

  if (!book) {
    return (
      <div className="p-8 text-center">
        <p className="text-secondary mb-3">Book not found</p>
        <Link href="/books" className={BTN_PRIMARY}>Back to library</Link>
      </div>
    );
  }

  if (!book.hasPdf) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <BookOpen className="mx-auto text-muted mb-3" size={28} />
        <p className="text-secondary mb-3">No PDF uploaded for “{book.title}”.</p>
        <Link href="/books" className={BTN_PRIMARY}>Back to library</Link>
      </div>
    );
  }

  const pageNotes = (book.annotations ?? []).filter(a => a.page === page);
  const allNotes = [...(book.annotations ?? [])].sort(
    (a, b) => a.page - b.page || a.createdAt.localeCompare(b.createdAt),
  );

  return (
    <div className="flex flex-col min-h-0" style={{ height: 'calc(100dvh - 7.5rem)' }}>
      <header className="shrink-0 border-b border-base bg-surface/80 backdrop-blur-sm px-3 sm:px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <Link href="/books" className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-raised">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold font-display text-primary truncate">{book.title}</h1>
          <p className="text-[11px] text-muted">
            Page {page}{numPages ? ` / ${numPages}` : ''}
            {rendering ? ' · rendering…' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => goTo(page - 1)} className="p-2 rounded-lg border border-base text-secondary disabled:opacity-30 hover:bg-raised">
            <ChevronLeft size={16} />
          </button>
          <input
            type="number"
            min={1}
            max={numPages || undefined}
            value={page}
            onChange={e => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) goTo(n);
            }}
            className="w-14 px-1 py-1.5 text-center text-xs bg-raised border border-base rounded-lg"
          />
          <button type="button" disabled={!!numPages && page >= numPages} onClick={() => goTo(page + 1)} className="p-2 rounded-lg border border-base text-secondary disabled:opacity-30 hover:bg-raised">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => setShowPanel(v => !v)} className="p-2 rounded-lg border border-base text-secondary hover:bg-raised ml-1" title="Notes panel">
            <List size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
        <div className="flex-1 min-w-0 min-h-0 overflow-auto os-scroll bg-base order-1" ref={containerRef}>
          <div className="py-4 flex justify-center" onMouseUp={captureSelection}>
            <div className="relative shadow-sm border border-base bg-white inline-block max-w-full">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
              <div
                ref={textLayerRef}
                className="absolute left-0 top-0 overflow-hidden select-text"
              />
            </div>
          </div>
        </div>

        {showPanel && (
          <aside className="w-full sm:w-80 shrink-0 border-t sm:border-t-0 sm:border-l border-base bg-surface flex flex-col min-h-0 max-h-[42vh] sm:max-h-none">
            <div className="p-3 border-b border-base">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">On this page</h2>
              {selectedText && (
                <p className="text-[11px] text-secondary bg-raised border border-base rounded-lg p-2 mb-2 line-clamp-3">
                  “{selectedText}”
                </p>
              )}
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note for this page…"
                rows={3}
                className={`${FORM_INPUT} resize-none text-xs mb-2`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingNote}
                  onClick={() => void addAnnotation('highlight')}
                  className={`${BTN_SECONDARY} flex-1 text-xs justify-center inline-flex items-center gap-1`}
                >
                  <Highlighter size={12} /> Highlight
                </button>
                <button
                  type="button"
                  disabled={savingNote}
                  onClick={() => void addAnnotation('note')}
                  className={`${BTN_PRIMARY} flex-1 text-xs justify-center inline-flex items-center gap-1`}
                >
                  <StickyNote size={12} /> Note
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto os-scroll p-3 space-y-2">
              <p className="text-[10px] text-muted uppercase tracking-wide">Page {page}</p>
              {pageNotes.length === 0 ? (
                <p className="text-xs text-muted py-2">No annotations on this page.</p>
              ) : pageNotes.map(a => (
                <AnnotationCard key={a.id} a={a} onDelete={() => void removeAnnotation(a.id)} onJump={() => {}} />
              ))}

              <p className="text-[10px] text-muted uppercase tracking-wide pt-3">All annotations</p>
              {allNotes.length === 0 ? (
                <p className="text-xs text-muted">None yet — select text or add a note.</p>
              ) : allNotes.map(a => (
                <AnnotationCard
                  key={`all-${a.id}`}
                  a={a}
                  onDelete={() => void removeAnnotation(a.id)}
                  onJump={() => goTo(a.page)}
                />
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function AnnotationCard({
  a, onDelete, onJump,
}: {
  a: BookAnnotation;
  onDelete: () => void;
  onJump: () => void;
}) {
  return (
    <div className="rounded-lg border border-base bg-raised/40 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onJump} className="text-[10px] text-muted hover:text-primary">
          p.{a.page} · {a.type}
        </button>
        <button type="button" onClick={onDelete} className="text-muted hover:text-red-400 p-0.5">
          <Trash2 size={12} />
        </button>
      </div>
      {a.selectedText && (
        <p className="text-[11px] text-secondary mt-1 border-l-2 pl-2" style={{ borderColor: a.color }}>
          {a.selectedText}
        </p>
      )}
      {a.note && <p className="text-xs text-primary mt-1.5 whitespace-pre-wrap">{a.note}</p>}
    </div>
  );
}
