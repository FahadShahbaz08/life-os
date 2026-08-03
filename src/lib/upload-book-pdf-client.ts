import type { BookPublic } from '@/lib/books';

/** Stay under Vercel’s ~4.5MB request body limit (multipart + file easily exceeds it). */
const CHUNK_SIZE = 3 * 1024 * 1024;
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Upload a PDF in small binary chunks, then store/compress server-side.
 */
export async function uploadBookPdf(bookId: string, file: File): Promise<BookPublic> {
  if (file.size <= 0) throw new Error('Empty file');
  if (file.size > MAX_BYTES) throw new Error('PDF must be under 20MB');
  const name = file.name || 'book.pdf';
  if (!name.toLowerCase().endsWith('.pdf') && file.type && !file.type.includes('pdf')) {
    throw new Error('Only PDF files are supported');
  }

  const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
  const uploadId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let lastJson: unknown = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const blob = file.slice(start, Math.min(start + CHUNK_SIZE, file.size));
    const res = await fetch(`/api/books/${bookId}/pdf/chunk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Upload-Id': uploadId,
        'X-Chunk-Index': String(i),
        'X-Total-Chunks': String(totalChunks),
        'X-File-Name': encodeURIComponent(name),
        'X-Total-Size': String(file.size),
      },
      body: blob,
    });

    const data = await res.json().catch(() => ({})) as { error?: string; complete?: boolean };
    if (!res.ok) {
      throw new Error(data.error || `Upload failed (${res.status})`);
    }
    lastJson = data;

    // Final response is the BookPublic object (has id + title)
    if (data && typeof data === 'object' && 'id' in data && (data as BookPublic).id) {
      return data as BookPublic;
    }
  }

  if (lastJson && typeof lastJson === 'object' && lastJson !== null && 'id' in lastJson) {
    return lastJson as BookPublic;
  }
  throw new Error('Upload incomplete — please retry');
}
