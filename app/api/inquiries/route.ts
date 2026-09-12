import { guardMutation } from '../../../lib/request-guard';
import { readJsonObject } from '../../../lib/request-policy';
import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { isSupabaseConfigured } from '../../../lib/supabase/config';
import { getOwnerUser } from '../../../lib/auth';
import { parseInquiry } from '../../../lib/inquiry-policy';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getOwnerUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from('project_inquiries').select('id,name,contact,project_type,timeline_budget,brief,locale,status,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inquiries: (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    contact: item.contact,
    projectType: item.project_type,
    timelineBudget: item.timeline_budget,
    brief: item.brief,
    locale: item.locale,
    status: item.status,
    createdAt: item.created_at,
  })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Inquiry service is not configured' }, { status: 503 });
  const blocked = await guardMutation(request, 'inquiry', 5);
  if (blocked) return blocked;
  const parsed = parseInquiry(await readJsonObject(request));
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('project_inquiries').insert({
    name: parsed.data.name,
    contact: parsed.data.contact,
    project_type: parsed.data.projectType,
    timeline_budget: parsed.data.timelineBudget,
    brief: parsed.data.brief,
    locale: parsed.data.locale,
  });
  if (error) return NextResponse.json({ error: 'Inquiry could not be saved' }, { status: 503 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
