import Link from 'next/link';
import MemberLogin from '../components/MemberLogin';
import { getCurrentUser } from '../../lib/auth';
import { isSupabaseConfigured } from '../../lib/supabase/config';
import StudioUploader from './StudioUploader';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const user = await getCurrentUser();
  const isOwner = Boolean(user?.email && user.email.toLowerCase() === process.env.SITE_OWNER_EMAIL?.trim().toLowerCase());
  if (!isSupabaseConfigured) return <main className="studio-denied"><p>SETUP REQUIRED</p><h1>CONNECT<br />SUPABASE.</h1><p>README의 환경 변수와 데이터베이스 설정을 완료해주세요.</p><Link href="/">RETURN TO BOTTOPIA ↗</Link></main>;
  if (!user) return <main className="studio-denied"><p>PRIVATE CREATOR CONSOLE</p><h1>SIGN IN<br />TO ENTER.</h1><MemberLogin /><Link href="/">RETURN TO BOTTOPIA ↗</Link></main>;
  if (!isOwner) return <main className="studio-denied"><p>403 / PRIVATE FREQUENCY</p><h1>THIS CHANNEL<br />IS OWNER-ONLY.</h1><MemberLogin /><Link href="/">RETURN TO BOTTOPIA ↗</Link></main>;
  return (
    <main className="studio-shell"><header className="studio-header"><Link className="brand" href="/">BOT<span>•</span>TOPIA</Link><div><span>{user.email}</span><MemberLogin compact /></div></header>
      <section className="studio-title"><p className="eyebrow">PRIVATE CREATOR CONSOLE · OWNER ACCESS</p><h1>UPLOAD A<br />NEW WORLD.</h1><p>영상, 제작 도구, 프롬프트를 한 번에 공개하세요.</p></section><StudioUploader />
    </main>
  );
}
