import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import BottopiaPage from '../page';

const sections = ['original', 'community', 'ecosystem', 'about'] as const;
type Section = (typeof sections)[number];

const metadataBySection: Record<Section, Metadata> = {
  original: { title: 'Original Lab · BOTTOPIA', description: 'BOTTOPIA가 직접 만든 오리지널 AI 비주얼 프로젝트를 소개합니다.' },
  community: { title: 'Community · BOTTOPIA', description: '작품을 보고, 프롬프트를 배우고, 창작 결과를 나누는 BOTTOPIA 커뮤니티입니다.' },
  ecosystem: { title: 'Ecosystem · BOTTOPIA', description: '아이디어에서 캐릭터, 이야기, 모션과 리믹스로 이어지는 BOTTOPIA의 창작 생태계입니다.' },
  about: { title: 'About · BOTTOPIA', description: 'BOTTOPIA의 창작 방향과 AI 필름, 캐릭터, 캠페인 제작 영역을 소개합니다.' },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return sections.includes(section as Section) ? metadataBySection[section as Section] : {};
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.includes(section as Section)) notFound();
  if (section === 'original') redirect('/?collection=originals#work');
  return <BottopiaPage />;
}
