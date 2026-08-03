import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { deleteAnnotation, saveAnnotation, type AnnotationType } from '@/lib/books';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const body = await request.json() as {
      id?: string;
      page?: number;
      type?: AnnotationType;
      selectedText?: string;
      note?: string;
      color?: string;
    };
    if (!body.page || body.page < 1) {
      return NextResponse.json({ error: 'Valid page required' }, { status: 400 });
    }
    if (!body.note?.trim() && !body.selectedText?.trim()) {
      return NextResponse.json({ error: 'Note or highlight text required' }, { status: 400 });
    }
    const book = await saveAnnotation(session.user.id, id, {
      id: body.id,
      page: body.page,
      type: body.type === 'highlight' ? 'highlight' : 'note',
      selectedText: body.selectedText?.trim() ?? '',
      note: body.note?.trim() ?? '',
      color: body.color || '#facc15',
    });
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(book);
  } catch (err) {
    console.error('Annotation POST', err);
    return NextResponse.json({ error: 'Failed to save annotation' }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const annotationId = url.searchParams.get('annotationId');
  if (!annotationId) {
    return NextResponse.json({ error: 'annotationId required' }, { status: 400 });
  }
  try {
    const book = await deleteAnnotation(session.user.id, id, annotationId);
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(book);
  } catch (err) {
    console.error('Annotation DELETE', err);
    return NextResponse.json({ error: 'Failed to delete annotation' }, { status: 500 });
  }
}
