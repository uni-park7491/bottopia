import { NextResponse } from 'next/server';
import { videoReferences } from '../../../lib/video-references';

export async function GET() {
  return NextResponse.json({ references: videoReferences.map(item => ({ ...item, prompt: '' })) });
}
