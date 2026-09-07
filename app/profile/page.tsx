import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import ProfileEditor from './ProfileEditor';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My Creator Profile · BOTTOPIA',
  description: 'BOTTOPIA에 표시될 창작자 소개와 소셜 링크를 관리합니다.',
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=%2Fprofile&lang=ko');
  let siteHost = 'localhost:3000';
  try { siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').host; } catch { /* keep safe local label */ }
  return <ProfileEditor email={user.email ?? ''} siteHost={siteHost} />;
}
