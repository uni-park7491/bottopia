import type { Metadata } from 'next';
import CreativeTools from './CreativeTools';
import './tools.css';
import './workspace.css';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';

export const metadata: Metadata = { title: '시나리오·샷리스트 베타 · BOTTOPIA', description: '아이디어를 시나리오로, 시나리오를 샷리스트로. 방문자 기기에서 실행하는 AI 창작 도구 베타.' };
export const dynamic = 'force-dynamic';
export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=%2Ftools&lang=ko');
  return <CreativeTools key={user.id} memberId={user.id} />;
}
