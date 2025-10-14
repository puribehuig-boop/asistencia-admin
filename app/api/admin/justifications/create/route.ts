import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Body JSON:
 * {
 *   employee_id: string,
 *   day: 'YYYY-MM-DD',
 *   field: 'start_day'|'start_break'|'end_break'|'end_day',
 *   new_time: 'HH:MM',
 *   reason?: string,
 *   evidence_path?: string,
 *   created_by?: string|null,
 *   status?: 'approved'|'pending'|'rejected'
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ['employee_id', 'day', 'field', 'new_time'];
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ ok: false, error: `Falta ${k}` }, { status: 400 });
    }

    const s = supabaseService();
    const payload = {
      employee_id: body.employee_id,
      day: body.day,
      field: body.field,
      new_time: body.new_time,
      reason: body.reason ?? null,
      evidence_path: body.evidence_path ?? null,
      status: (body.status as string) || 'approved',
      created_by: body.created_by ?? null,
    };

    const { error } = await s.from('justifications').insert(payload);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
