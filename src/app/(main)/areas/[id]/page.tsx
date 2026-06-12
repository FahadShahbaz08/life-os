'use client';

import { use } from 'react';
import { AreaDetailPage } from '@/components/areas/AreasPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AreaDetailPage areaId={id} />;
}
