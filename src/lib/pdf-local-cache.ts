/**
 * Device-local PDF cache (IndexedDB).
 * localStorage is too small (~5MB) for real PDFs; IndexedDB holds binary safely.
 */

const DB_NAME = 'lifeos-pdf-cache';
const STORE = 'pdfs';
const DB_VERSION = 1;

export type PdfCacheMeta = {
  id: string;
  pdfSizeBytes: number | null;
  pdfCompressedSize: number | null;
  pdfOriginalName: string | null;
};

/** Fingerprint of the server PDF — changes when file is replaced. */
export function pdfFingerprint(meta: PdfCacheMeta): string {
  return [
    meta.id,
    meta.pdfSizeBytes ?? 0,
    meta.pdfCompressedSize ?? 0,
    meta.pdfOriginalName ?? '',
  ].join('|');
}

type CacheRow = {
  bookId: string;
  fingerprint: string;
  data: ArrayBuffer;
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'bookId' });
      }
    };
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IDB request failed'));
  });
}

/** Returns cached PDF bytes if fingerprint still matches the server meta. */
export async function getCachedPdf(meta: PdfCacheMeta): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, 'readonly');
      const row = await idbReq(tx.objectStore(STORE).get(meta.id) as IDBRequest<CacheRow | undefined>);
      if (!row?.data) return null;
      if (row.fingerprint !== pdfFingerprint(meta)) return null;
      return row.data;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Store / replace cache for a book. Best-effort if quota is full. */
export async function setCachedPdf(meta: PdfCacheMeta, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const row: CacheRow = {
        bookId: meta.id,
        fingerprint: pdfFingerprint(meta),
        data,
        savedAt: Date.now(),
      };
      await idbReq(tx.objectStore(STORE).put(row));
    } finally {
      db.close();
    }
  } catch (e) {
    // QuotaExceeded or private mode — open still works without cache
    console.warn('PDF cache write failed', e);
  }
}

/** Drop cache when PDF is deleted or re-uploaded. */
export async function clearCachedPdf(bookId: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, 'readwrite');
      await idbReq(tx.objectStore(STORE).delete(bookId));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}
