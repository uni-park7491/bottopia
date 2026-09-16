import { redirect } from 'next/navigation';
// Existing shared links enter the same authenticated workspace.
export default async function TtsPage({ searchParams }: { searchParams: Promise<{ model?: string }> }) {
  const engine = (await searchParams).model === 'qwen' ? 'qwen' : 'supertonic';
  redirect(`/tools?tab=audio&model=${engine}`);
}
