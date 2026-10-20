import type { Metadata } from 'next';
import SajuExperience from './SajuExperience';
export const metadata: Metadata = { title: '사주 · 재미 · BOTTOPIA', description: '내 사주, 오늘의 카드와 궁합을 먹빛 사주에서 확인하세요. 재미와 자기 돌아보기를 위한 공간입니다.', alternates: { canonical: '/fun/saju' } };
export default function SajuPage() { return <SajuExperience />; }
