import MemberLogin from '../components/MemberLogin';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { isSiteOwner } from '../../lib/auth-policy';
import StudioUploader from './StudioUploader';
import InquiryInbox from './InquiryInbox';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const user = await getCurrentUser();
  const isOwner = isSiteOwner(user, process.env.SITE_OWNER_USER_ID, process.env.SITE_OWNER_EMAIL);
  if (!user) redirect('/login?next=%2Fstudio&lang=ko');
  if (!isOwner) return <main className="studio-denied"><p>403 / PRIVATE FREQUENCY</p><h1>THIS CHANNEL<br />IS OWNER-ONLY.</h1><MemberLogin /><Link href="/">RETURN TO BOTTOPIA ↗</Link></main>;
  return (
    <main className="studio-shell">
      <section className="studio-title"><p className="eyebrow">PRIVATE CREATOR STUDIO · OWNER ACCESS</p><h1>BUILD THE<br />ARCHIVE.</h1><p>작품과 제작 과정을 공개하고, 도착한 프로젝트 문의를 한곳에서 관리하세요.</p></section><StudioUploader /><InquiryInbox />
    </main>
  );
}
