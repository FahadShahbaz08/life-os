import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getBookPdfBuffer, storeBookPdf } from '@/lib/books';

type Ctx = { params: Promise<{ id: string }> };

export const runtime = 'nodejs';

// ~20MB limit soft check
const MAX_BYTES = 20 * 1024 * 1024;

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const file = await getBookPdfBuffer(session.user.id, id);
    if (!file) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    console.error('PDF GET', err);
    return NextResponse.json({ error: 'Failed to load PDF' }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'PDF file required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'PDF must be under 20MB' }, { status: 400 });
    }
    const mime = file.type || 'application/pdf';
    if (!mime.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const book = await storeBookPdf(session.user.id, id, {
      buffer,
      originalName: file.name,
      mimeType: mime,
    });
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json(book);
  } catch (err) {
    console.error('PDF POST', err);
    return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
  }
}
