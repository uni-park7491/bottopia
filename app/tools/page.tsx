import type { Metadata } from 'next';
import CreativeTools from './CreativeTools';
import './tools.css';
import './workspace.css';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';

export const metadata: Metadata = { title: '시나리오·샷리스트·TTS · BOTTOPIA', description: '시나리오와 샷리스트를 만들고, 언어와 목소리를 골라 음성으로 저장하세요. 사용자 기기에서 실행하는 창작 도구.' };
export const dynamic = 'force-dynamic';
export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ tab?: string; model?: string }> }) {
  const params = await searchParams;
  const initialTab = params.tab === 'audio' ? 'audio' : 'scenes';
  const initialEngine = params.model === 'qwen' ? 'qwen' : 'supertonic';
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(initialTab === 'audio' ? `/tools?tab=audio&model=${initialEngine}` : '/tools')}&lang=ko`);
  return <CreativeTools key={user.id} memberId={user.id} initialTab={initialTab} initialEngine={initialEngine} />;
}
