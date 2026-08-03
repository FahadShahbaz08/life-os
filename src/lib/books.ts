import { ObjectId, GridFSBucket, type Db } from 'mongodb';
import { gzipSync, gunzipSync } from 'zlib';
import { getDb } from '@/lib/mongodb';
import { generateId } from '@/lib/utils';

const BOOKS_COL = 'books';
const PDF_BUCKET = 'bookpdfs';

export type BookStatus = 'later' | 'reading' | 'finished';
export type AnnotationType = 'highlight' | 'note';

export interface BookAnnotation {
  id: string;
  page: number;
  type: AnnotationType;
  selectedText: string;
  note: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookDoc {
  _id: ObjectId;
  userId: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number | null;
  currentPage: number;
  hasPdf: boolean;
  pdfFileId: ObjectId | null;
  pdfOriginalName: string | null;
  pdfSizeBytes: number | null;
  pdfCompressedSize: number | null;
  annotations: BookAnnotation[];
  startedAt: string | null;
  finishedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookPublic {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number | null;
  currentPage: number;
  hasPdf: boolean;
  pdfOriginalName: string | null;
  pdfSizeBytes: number | null;
  pdfCompressedSize: number | null;
  annotations: BookAnnotation[];
  startedAt: string | null;
  finishedAt: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toPublic(doc: BookDoc): BookPublic {
  return {
    id: doc._id.toString(),
    title: doc.title,
    author: doc.author,
    status: doc.status,
    totalPages: doc.totalPages,
    currentPage: doc.currentPage,
    hasPdf: doc.hasPdf,
    pdfOriginalName: doc.pdfOriginalName,
    pdfSizeBytes: doc.pdfSizeBytes,
    pdfCompressedSize: doc.pdfCompressedSize,
    annotations: doc.annotations ?? [],
    startedAt: doc.startedAt,
    finishedAt: doc.finishedAt,
    lastOpenedAt: doc.lastOpenedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function booksCollection() {
  const db = await getDb();
  return db.collection<BookDoc>(BOOKS_COL);
}

function pdfBucket(db: Db) {
  return new GridFSBucket(db, { bucketName: PDF_BUCKET });
}

export async function listBooks(userId: string): Promise<BookPublic[]> {
  const col = await booksCollection();
  const docs = await col.find({ userId }).sort({ updatedAt: -1 }).toArray();
  return docs.map(toPublic);
}

export async function getBook(userId: string, bookId: string): Promise<BookPublic | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const doc = await col.findOne({ _id: new ObjectId(bookId), userId });
  return doc ? toPublic(doc) : null;
}

export async function createBook(
  userId: string,
  input: {
    title: string;
    author?: string;
    status: BookStatus;
    totalPages?: number | null;
    currentPage?: number;
  },
): Promise<BookPublic> {
  const now = new Date().toISOString();
  const status = input.status;
  const doc: BookDoc = {
    _id: new ObjectId(),
    userId,
    title: input.title.trim(),
    author: (input.author ?? '').trim(),
    status,
    totalPages: input.totalPages ?? null,
    currentPage: Math.max(1, input.currentPage ?? 1),
    hasPdf: false,
    pdfFileId: null,
    pdfOriginalName: null,
    pdfSizeBytes: null,
    pdfCompressedSize: null,
    annotations: [],
    startedAt: status === 'reading' || status === 'finished' ? now : null,
    finishedAt: status === 'finished' ? now : null,
    lastOpenedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const col = await booksCollection();
  await col.insertOne(doc);
  return toPublic(doc);
}

export async function updateBook(
  userId: string,
  bookId: string,
  patch: Partial<{
    title: string;
    author: string;
    status: BookStatus;
    totalPages: number | null;
    currentPage: number;
    lastOpenedAt: string | null;
  }>,
): Promise<BookPublic | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextStatus = patch.status ?? existing.status;
  const update: Partial<BookDoc> = {
    updatedAt: now,
  };

  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.author !== undefined) update.author = patch.author.trim();
  if (patch.totalPages !== undefined) update.totalPages = patch.totalPages;
  if (patch.currentPage !== undefined) update.currentPage = Math.max(1, patch.currentPage);
  if (patch.lastOpenedAt !== undefined) update.lastOpenedAt = patch.lastOpenedAt;
  if (patch.status !== undefined) {
    update.status = nextStatus;
    if (nextStatus === 'reading' && !existing.startedAt) update.startedAt = now;
    if (nextStatus === 'finished') {
      update.finishedAt = now;
      if (!existing.startedAt) update.startedAt = now;
    }
    if (nextStatus === 'later') {
      update.finishedAt = null;
    }
  }

  await col.updateOne({ _id: existing._id }, { $set: update });
  return getBook(userId, bookId);
}

export async function saveAnnotation(
  userId: string,
  bookId: string,
  annotation: Omit<BookAnnotation, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<BookPublic | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing) return null;

  const now = new Date().toISOString();
  const list = [...(existing.annotations ?? [])];
  if (annotation.id) {
    const idx = list.findIndex(a => a.id === annotation.id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        page: annotation.page,
        type: annotation.type,
        selectedText: annotation.selectedText,
        note: annotation.note,
        color: annotation.color,
        updatedAt: now,
      };
    }
  } else {
    list.push({
      id: generateId(),
      page: annotation.page,
      type: annotation.type,
      selectedText: annotation.selectedText,
      note: annotation.note,
      color: annotation.color || '#facc15',
      createdAt: now,
      updatedAt: now,
    });
  }

  await col.updateOne(
    { _id: existing._id },
    { $set: { annotations: list, updatedAt: now } },
  );
  return getBook(userId, bookId);
}

export async function deleteAnnotation(
  userId: string,
  bookId: string,
  annotationId: string,
): Promise<BookPublic | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing) return null;
  const now = new Date().toISOString();
  const list = (existing.annotations ?? []).filter(a => a.id !== annotationId);
  await col.updateOne(
    { _id: existing._id },
    { $set: { annotations: list, updatedAt: now } },
  );
  return getBook(userId, bookId);
}

async function deletePdfFile(fileId: ObjectId | null | undefined) {
  if (!fileId) return;
  const db = await getDb();
  const bucket = pdfBucket(db);
  try {
    await bucket.delete(fileId);
  } catch {
    // file may already be gone
  }
}

export type DeleteBookMode = 'pdf' | 'pdf_and_notes' | 'all';

export async function deleteBookParts(
  userId: string,
  bookId: string,
  mode: DeleteBookMode,
): Promise<{ ok: boolean; book?: BookPublic | null }> {
  if (!ObjectId.isValid(bookId)) return { ok: false };
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing) return { ok: false };

  const now = new Date().toISOString();

  if (mode === 'all') {
    await deletePdfFile(existing.pdfFileId);
    await col.deleteOne({ _id: existing._id });
    return { ok: true, book: null };
  }

  if (mode === 'pdf' || mode === 'pdf_and_notes') {
    await deletePdfFile(existing.pdfFileId);
    const nextAnnotations = mode === 'pdf_and_notes' ? [] : existing.annotations;
    await col.updateOne(
      { _id: existing._id },
      {
        $set: {
          hasPdf: false,
          pdfFileId: null,
          pdfOriginalName: null,
          pdfSizeBytes: null,
          pdfCompressedSize: null,
          annotations: nextAnnotations,
          updatedAt: now,
        },
      },
    );
    return { ok: true, book: await getBook(userId, bookId) };
  }

  return { ok: false };
}

export async function storeBookPdf(
  userId: string,
  bookId: string,
  file: { buffer: Buffer; originalName: string; mimeType: string },
): Promise<BookPublic | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing) return null;

  // Replace previous PDF if any
  await deletePdfFile(existing.pdfFileId);

  const originalSize = file.buffer.length;
  const compressed = gzipSync(file.buffer, { level: 6 });
  const payload = compressed.length < originalSize * 0.98 ? compressed : file.buffer;
  const usedGzip = payload !== file.buffer;

  const db = await getDb();
  const bucket = pdfBucket(db);

  const uploadStream = bucket.openUploadStream(`${bookId}.pdf${usedGzip ? '.gz' : ''}`, {
    contentType: usedGzip ? 'application/gzip' : (file.mimeType || 'application/pdf'),
    metadata: {
      userId,
      bookId,
      originalName: file.originalName,
      gzip: usedGzip,
      originalSize,
    },
  });

  const fileId = await new Promise<ObjectId>((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id as ObjectId));
    uploadStream.end(payload);
  });

  const now = new Date().toISOString();
  await col.updateOne(
    { _id: existing._id },
    {
      $set: {
        hasPdf: true,
        pdfFileId: fileId,
        pdfOriginalName: file.originalName,
        pdfSizeBytes: originalSize,
        pdfCompressedSize: payload.length,
        updatedAt: now,
      },
    },
  );

  return getBook(userId, bookId);
}

export async function getBookPdfBuffer(
  userId: string,
  bookId: string,
): Promise<{ buffer: Buffer; originalName: string; mimeType: string } | null> {
  if (!ObjectId.isValid(bookId)) return null;
  const col = await booksCollection();
  const existing = await col.findOne({ _id: new ObjectId(bookId), userId });
  if (!existing?.pdfFileId || !existing.hasPdf) return null;

  const db = await getDb();
  const bucket = pdfBucket(db);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = bucket.openDownloadStream(existing.pdfFileId!);
    stream.on('data', (c: Buffer) => chunks.push(c));
    stream.on('error', reject);
    stream.on('end', () => resolve());
  });

  let buffer = Buffer.concat(chunks);
  // Detect gzip (1f 8b) or metadata
  const files = db.collection(`${PDF_BUCKET}.files`);
  const meta = await files.findOne({ _id: existing.pdfFileId });
  const isGzip = meta?.metadata?.gzip === true || (buffer[0] === 0x1f && buffer[1] === 0x8b);
  if (isGzip) {
    try {
      buffer = gunzipSync(buffer);
    } catch {
      // leave as-is if gunzip fails
    }
  }

  return {
    buffer,
    originalName: existing.pdfOriginalName || 'book.pdf',
    mimeType: 'application/pdf',
  };
}
