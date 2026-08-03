import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createBook, listBooks, type BookStatus } from '@/lib/books';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const books = await listBooks(session.user.id);
    return NextResponse.json(books);
  } catch (err) {
    console.error('Books GET', err);
    return NextResponse.json({ error: 'Failed to load books' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await request.json() as {
      title?: string;
      author?: string;
      status?: BookStatus;
      totalPages?: number | null;
      currentPage?: number;
    };
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const status = body.status === 'later' || body.status === 'finished' ? body.status : 'reading';
    const book = await createBook(session.user.id, {
      title: body.title,
      author: body.author,
      status,
      totalPages: body.totalPages ?? null,
      currentPage: body.currentPage,
    });
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    console.error('Books POST', err);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
