import type { Metadata } from 'next';
import WorkDetail from './WorkDetail';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Project · BOTTOPIA',
  description: 'BOTTOPIA 작품과 제작 프롬프트를 함께 살펴보세요.',
};

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkDetail id={id} />;
}
