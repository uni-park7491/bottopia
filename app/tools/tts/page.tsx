/* Full document navigation releases the isolated TTS browsing context. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import LocalNarration from '../LocalNarration';
import '../tools.css';
import '../workspace.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'TTS · BOTTOPIA' };
export default async function TtsPage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const engine = (await searchParams).model === 'qwen' ? 'qwen' : 'supertonic';
  if (!await getCurrentUser()) redirect(`/login?next=${encodeURIComponent(`/tools/tts?model=${engine}`)}&lang=ko`);
  return <main className="creative-tools" lang="ko"><a href="/tools">← 창작 도구로 돌아가기</a><LocalNarration key={engine} engine={engine} /></main>;
}
