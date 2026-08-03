import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  deleteBookParts, getBook, updateBook, type BookStatus, type DeleteBookMode,
} from '@/lib/books';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const book = await getBook(session.user.id, id);
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(book);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const body = await request.json() as {
      title?: string;
      author?: string;
      status?: BookStatus;
      totalPages?: number | null;
      currentPage?: number;
      lastOpenedAt?: string | null;
    };
    const book = await updateBook(session.user.id, id, body);
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(book);
  } catch (err) {
    console.error('Book PATCH', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const mode = (url.searchParams.get('mode') || 'all') as DeleteBookMode;
  if (!['pdf', 'pdf_and_notes', 'all'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  try {
    const result = await deleteBookParts(session.user.id, id, mode);
    if (!result.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, book: result.book });
  } catch (err) {
    console.error('Book DELETE', err);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
