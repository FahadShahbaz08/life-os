'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Highlighter, StickyNote, Trash2, Loader2, BookOpen, List,
  ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import type { AnnotationType, BookAnnotation, BookPublic } from '@/lib/books';
import { getCachedPdf, setCachedPdf } from '@/lib/pdf-local-cache';
import { useToastContext } from '@/context/ToastContext';
import { FORM_INPUT, BTN_PRIMARY, BTN_SECONDARY } from '@/lib/constants';

interface Props {
  bookId: string;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.15;

export default function BookReader({ bookId }: Props) {
  const { toast } = useToastContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const zoomRef = useRef(1);

  const [book, setBook] = useState<BookPublic | null>(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadHint, setLoadHint] = useState('Opening book…');
  const [rendering, setRendering] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  /** Multiplier over fit-to-width (1 = fill panel width). */
  const [zoom, setZoom] = useState(1);
  const [layoutTick, setLayoutTick] = useState(0);

  zoomRef.current = zoom;

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
        setLoadHint('Loading book…');
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

        const cacheMeta = {
          id: meta.id,
          pdfSizeBytes: meta.pdfSizeBytes,
          pdfCompressedSize: meta.pdfCompressedSize,
          pdfOriginalName: meta.pdfOriginalName,
        };

        let data: Uint8Array;
        setLoadHint('Checking local cache…');
        const cached = await getCachedPdf(cacheMeta);
        if (cached) {
          setLoadHint('Opening from device cache…');
          data = new Uint8Array(cached);
        } else {
          setLoadHint('Downloading PDF (saved on this device)…');
          const pdfRes = await fetch(`/api/books/${bookId}/pdf`);
          if (!pdfRes.ok) throw new Error('PDF missing');
          const buffer = await pdfRes.arrayBuffer();
          data = new Uint8Array(buffer);
          if (!cancelled) {
            await setCachedPdf(cacheMeta, buffer.slice(0));
          }
        }

        if (cancelled) return;
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

  // Re-render when viewer size changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setLayoutTick(n => n + 1), 80);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (t) clearTimeout(t);
    };
  }, [loading, book?.hasPdf]);

  const renderPage = useCallback(async (pageNum: number) => {
    const doc = pdfDocRef.current;
    const canvas = canvasRef.current;
    const textLayerDiv = textLayerRef.current;
    if (!doc || !canvas) return;

    renderTaskRef.current?.cancel();
    setRendering(true);
    try {
      const pdfPage = await doc.getPage(pageNum);
      const box = containerRef.current;
      // Full width of the reading pane
      const containerWidth = Math.max(200, box?.clientWidth ?? 720);
      const unscaled = pdfPage.getViewport({ scale: 1 });
      const fitScale = (containerWidth - 2) / unscaled.width;
      const scale = Math.min(ZOOM_MAX * 1.5, Math.max(0.2, fitScale * zoomRef.current));
      const viewport = pdfPage.getViewport({ scale });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
  }, [page, numPages, zoom, layoutTick, renderPage]);

  const goTo = (p: number) => {
    if (p < 1 || (numPages && p > numPages)) return;
    setPage(p);
    void saveProgress(p, numPages || undefined);
  };

  const adjustZoom = (delta: number) => {
    setZoom(z => Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)) * 100) / 100);
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
      <div className="absolute inset-0 flex items-center justify-center text-muted gap-2 bg-base">
        <Loader2 className="animate-spin" size={18} /> {loadHint}
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
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    /* Fill entire main content pane (parent is relative) */
    <div className="absolute inset-0 flex flex-col min-h-0 bg-base">
      <header className="shrink-0 border-b border-base bg-surface/90 backdrop-blur-sm px-2 sm:px-3 py-2 flex items-center gap-1.5 sm:gap-2 flex-wrap z-10">
        <Link href="/books" className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-raised shrink-0">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1 basis-[8rem]">
          <h1 className="text-sm font-semibold font-display text-primary truncate">{book.title}</h1>
          <p className="text-[11px] text-muted">
            Page {page}{numPages ? ` / ${numPages}` : ''}
            {rendering ? ' · rendering…' : ''}
          </p>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 border border-base rounded-lg p-0.5 bg-raised/40">
          <button
            type="button"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => adjustZoom(-ZOOM_STEP)}
            className="p-1.5 rounded-md text-secondary disabled:opacity-30 hover:bg-raised"
            title="Zoom out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="px-1.5 min-w-[3rem] text-[11px] font-medium text-secondary hover:text-primary tabular-nums"
            title="Reset to fit width"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => adjustZoom(ZOOM_STEP)}
            className="p-1.5 rounded-md text-secondary disabled:opacity-30 hover:bg-raised"
            title="Zoom in"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-md text-secondary hover:bg-raised hidden sm:inline-flex"
            title="Fit width"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
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
            className="w-12 sm:w-14 px-1 py-1.5 text-center text-xs bg-raised border border-base rounded-lg"
          />
          <button type="button" disabled={!!numPages && page >= numPages} onClick={() => goTo(page + 1)} className="p-2 rounded-lg border border-base text-secondary disabled:opacity-30 hover:bg-raised">
            <ChevronRight size={16} />
          </button>
          <button type="button" onClick={() => setShowPanel(v => !v)} className="p-2 rounded-lg border border-base text-secondary hover:bg-raised" title="Notes panel">
            <List size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
        <div
          className="flex-1 min-w-0 min-h-0 overflow-auto os-scroll bg-base order-1 sm:order-none"
          ref={containerRef}
        >
          <div className="min-h-full flex justify-center items-start" onMouseUp={captureSelection}>
            <div className="relative bg-white shadow-sm">
              <canvas ref={canvasRef} className="block" />
              <div
                ref={textLayerRef}
                className="absolute left-0 top-0 overflow-hidden select-text"
              />
            </div>
          </div>
        </div>

        {showPanel && (
          <aside className="w-full sm:w-72 lg:w-80 shrink-0 border-t sm:border-t-0 sm:border-l border-base bg-surface flex flex-col min-h-0 h-[38vh] sm:h-auto sm:max-h-none order-2">
            <div className="p-3 border-b border-base shrink-0">
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
