import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCreatorAccess } from '../../lib/creator-access';
import StudioUploader from './StudioUploader';
import InquiryInbox from './InquiryInbox';

export const dynamic = 'force-dynamic';

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ remix?: string }> }) {
  const params = await searchParams;
  const remix = typeof params.remix === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(params.remix) ? params.remix : '';
  const access = await getCreatorAccess();
  if (!access) redirect(`/login?${new URLSearchParams({ next: remix ? `/studio?remix=${remix}` : '/studio', lang: 'ko' })}`);
  if (!access.canUpload) return <main className="studio-shell"><section className="studio-title"><p className="eyebrow">CREATOR STUDIO</p><h1>함께 만들 준비.</h1><p>현재 작품 업로드는 승인된 크리에이터에게 열려 있습니다. 프로필을 준비하고 운영자에게 참여 승인을 요청해주세요. 승인 전에도 작품 감상과 프롬프트 복사는 자유롭게 이용할 수 있습니다.</p><Link href="/profile">내 프로필 준비하기</Link><p><a href="mailto:bottopia030@gmail.com?subject=BOTTOPIA%20크리에이터%20참여">참여 문의 · bottopia030@gmail.com</a></p><Link href="/">작품 둘러보기</Link></section></main>;
  return (
    <main className="studio-shell">
      <section className="studio-title"><p className="eyebrow">CREATOR STUDIO</p><h1>당신의 다음 장면을<br />공유해주세요.</h1><p>직접 만든 영상과 프롬프트, 제작 과정을 함께 남겨주세요. 영상 생성은 사용하시는 외부 AI 도구에서 진행합니다.</p></section><StudioUploader isOwner={access.isOwner} initialRemix={remix} />{access.isOwner && <InquiryInbox />}
    </main>
  );
}
