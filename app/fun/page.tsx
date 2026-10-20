import type { Metadata } from 'next';
import FunHub from './FunHub';
export const metadata: Metadata = { title: '재미 · BOTTOPIA', description: '잠깐 쉬어가는 봇토피아의 재미 공간. 사주와 오늘의 카드, 궁합을 즐겨보세요.', alternates: { canonical: '/fun' } };
export default function FunPage() { return <FunHub />; }
