import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { MAX_PDF_BYTES, savePdfUploadChunk } from '@/lib/pdf-upload-chunks';

type Ctx = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

/**
 * Accept one binary chunk of a PDF (avoids Vercel ~4.5MB body limit).
 * Headers: X-Upload-Id, X-Chunk-Index, X-Total-Chunks, X-File-Name, X-Total-Size
 */
export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: bookId } = await ctx.params;

  try {
    const uploadId = request.headers.get('x-upload-id')?.trim();
    const chunkIndex = Number(request.headers.get('x-chunk-index'));
    const totalChunks = Number(request.headers.get('x-total-chunks'));
    const totalSize = Number(request.headers.get('x-total-size'));
    const nameHeader = request.headers.get('x-file-name') || 'book.pdf';
    let originalName = 'book.pdf';
    try {
      originalName = decodeURIComponent(nameHeader);
    } catch {
      originalName = nameHeader;
    }

    if (!uploadId || uploadId.length > 80) {
      return NextResponse.json({ error: 'Missing upload id' }, { status: 400 });
    }
    if (!Number.isFinite(chunkIndex) || !Number.isFinite(totalChunks) || !Number.isFinite(totalSize)) {
      return NextResponse.json({ error: 'Invalid chunk headers' }, { status: 400 });
    }
    if (totalSize > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 });
    }

    const ab = await request.arrayBuffer();
    const data = Buffer.from(ab);
    if (data.length === 0) {
      return NextResponse.json({ error: 'Empty chunk' }, { status: 400 });
    }

    const result = await savePdfUploadChunk({
      userId: session.user.id,
      bookId,
      uploadId,
      chunkIndex,
      totalChunks,
      originalName,
      totalSize,
      data,
    });

    if (!result.complete) {
      return NextResponse.json({
        ok: true,
        complete: false,
        chunkIndex,
        totalChunks,
      });
    }

    return NextResponse.json(result.book);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload chunk';
    const status =
      message.includes('not found') ? 404
        : message.includes('Invalid') || message.includes('not a valid') || message.includes('mismatch') || message.includes('under')
          ? 400
          : 500;
    if (status === 500) console.error('PDF chunk POST', err);
    return NextResponse.json({ error: message }, { status });
  }
}
