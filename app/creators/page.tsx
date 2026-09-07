import type { Metadata } from 'next';
import CreatorsDirectory from './CreatorsDirectory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Creators · BOTTOPIA',
  description: '작품과 제작 과정을 공개하는 BOTTOPIA AI 영상 창작자를 만나보세요.',
};

export default function CreatorsPage() {
  return <CreatorsDirectory />;
}

