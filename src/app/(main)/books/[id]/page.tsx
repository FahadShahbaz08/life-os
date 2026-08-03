import BookReader from '@/components/books/BookReader';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BookReader bookId={id} />;
}
