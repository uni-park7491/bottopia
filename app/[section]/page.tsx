import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import BottopiaPage from '../page';

const sections = ['original', 'community', 'ecosystem', 'about'] as const;
type Section = (typeof sections)[number];

const metadataBySection: Record<Section, Metadata> = {
  original: { title: 'Original Lab · BOTTOPIA', description: 'BOTTOPIA가 직접 만든 오리지널 AI 비주얼 프로젝트를 소개합니다.' },
  community: { title: '함께 만들 사람 찾기 · BOTTOPIA', description: '영상, 음악, 이야기를 함께 만들 동료를 만나세요. 역할별 협업 모집과 관심 키워드 알림을 제공하는 봇토피아 커뮤니티입니다.' },
  ecosystem: { title: 'Ecosystem · BOTTOPIA', description: '아이디어에서 캐릭터, 이야기, 모션과 리믹스로 이어지는 BOTTOPIA의 창작 생태계입니다.' },
  about: { title: '소개 · BOTTOPIA', description: 'BOTTOPIA의 창작 방향과 아이디어, 캐릭터, 이야기, 모션, 리믹스로 이어지는 창작 랩을 소개합니다.' },
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
  if (section === 'ecosystem') redirect('/about#lab');
  return <BottopiaPage />;
}
