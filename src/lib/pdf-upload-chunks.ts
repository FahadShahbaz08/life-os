import { Binary, ObjectId } from 'mongodb';
import { getDb } from '@/lib/mongodb';
import { getBook, storeBookPdf, type BookPublic } from '@/lib/books';

const CHUNK_COL = 'book_pdf_upload_chunks';
/** Vercel/serverless body limit is ~4.5MB — keep chunks under that. */
export const PDF_CHUNK_SIZE = 3 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
const CHUNK_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UploadChunkDoc {
  _id?: ObjectId;
  userId: string;
  bookId: string;
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  originalName: string;
  totalSize: number;
  data: Binary;
  expiresAt: Date;
  createdAt: Date;
}

async function chunkCollection() {
  const db = await getDb();
  return db.collection<UploadChunkDoc>(CHUNK_COL);
}

export async function savePdfUploadChunk(input: {
  userId: string;
  bookId: string;
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  originalName: string;
  totalSize: number;
  data: Buffer;
}): Promise<{ complete: false } | { complete: true; book: BookPublic }> {
  if (!ObjectId.isValid(input.bookId)) {
    throw new Error('Invalid book id');
  }
  if (input.totalSize > MAX_PDF_BYTES) {
    throw new Error('PDF must be under 20MB');
  }
  if (input.chunkIndex < 0 || input.chunkIndex >= input.totalChunks) {
    throw new Error('Invalid chunk index');
  }
  if (input.totalChunks < 1 || input.totalChunks > 20) {
    throw new Error('Invalid chunk count');
  }
  if (input.data.length > PDF_CHUNK_SIZE + 64 * 1024) {
    throw new Error('Chunk too large');
  }

  // Ensure book ownership early
  const existing = await getBook(input.userId, input.bookId);
  if (!existing) {
    throw new Error('Book not found');
  }

  const col = await chunkCollection();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHUNK_TTL_MS);

  await col.updateOne(
    {
      userId: input.userId,
      bookId: input.bookId,
      uploadId: input.uploadId,
      chunkIndex: input.chunkIndex,
    },
    {
      $set: {
        totalChunks: input.totalChunks,
        originalName: input.originalName,
        totalSize: input.totalSize,
        data: new Binary(input.data),
        expiresAt,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const received = await col.countDocuments({
    userId: input.userId,
    bookId: input.bookId,
    uploadId: input.uploadId,
  });

  if (received < input.totalChunks) {
    return { complete: false };
  }

  const rows = await col
    .find({
      userId: input.userId,
      bookId: input.bookId,
      uploadId: input.uploadId,
    })
    .sort({ chunkIndex: 1 })
    .toArray();

  // Ensure contiguous 0..n-1
  if (rows.length !== input.totalChunks) {
    return { complete: false };
  }
  for (let i = 0; i < input.totalChunks; i++) {
    if (rows[i]?.chunkIndex !== i) {
      throw new Error('Missing upload chunks — please retry');
    }
  }

  const parts = rows.map(r => Buffer.from(r.data.buffer));
  const buffer = Buffer.concat(parts);

  if (buffer.length !== input.totalSize) {
    await col.deleteMany({
      userId: input.userId,
      bookId: input.bookId,
      uploadId: input.uploadId,
    });
    throw new Error('Upload size mismatch — please retry');
  }

  // Magic number %PDF
  if (buffer.length < 5 || buffer.subarray(0, 4).toString('ascii') !== '%PDF') {
    await col.deleteMany({
      userId: input.userId,
      bookId: input.bookId,
      uploadId: input.uploadId,
    });
    throw new Error('File is not a valid PDF');
  }

  try {
    const book = await storeBookPdf(input.userId, input.bookId, {
      buffer,
      originalName: input.originalName || 'book.pdf',
      mimeType: 'application/pdf',
    });
    if (!book) throw new Error('Book not found');
    return { complete: true, book };
  } finally {
    await col.deleteMany({
      userId: input.userId,
      bookId: input.bookId,
      uploadId: input.uploadId,
    });
  }
}
