import type { Metadata } from 'next';
import CreatorProfile from './CreatorProfile';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creator · BOTTOPIA',
  description: 'BOTTOPIA 창작자의 작품, 공개 프롬프트와 외부 채널을 확인하세요.',
};

export default async function CreatorPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <CreatorProfile handle={handle} />;
}

