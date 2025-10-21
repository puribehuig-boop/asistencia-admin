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
    const required = ['employee_id', 'day', 'field', 'new_time'] as const;
    for (const k of required) {
      if (!body?.[k]) return NextResponse.json({ ok: false, error: `Falta ${k}` }, { status: 400 });
    }

    const s = supabaseService();

    // 1) Guarda la justificación
    const payload = {
      employee_id: body.employee_id as string,
      day: body.day as string,
      field: body.field as 'start_day'|'start_break'|'end_break'|'end_day',
      new_time: body.new_time as string,
      reason: body.reason ?? null,
      evidence_path: body.evidence_path ?? null,
      status: (body.status as string) || 'approved',
      created_by: body.created_by ?? null,
    };
    const ins = await s.from('justifications').insert(payload);
    if (ins.error) {
      return NextResponse.json({ ok: false, error: ins.error.message }, { status: 400 });
    }

    // 2) Refleja la justificación como "marcación" en punches (source='justification')
    //    Construimos un timestamp con zona de CDMX. México eliminó DST en CDMX, offset ~ -06:00.
    const day = String(body.day);
    const hhmm = String(body.new_time);
    const type = String(body.field) as 'start_day'|'start_break'|'end_break'|'end_day';
    const employee_id = String(body.employee_id);

    // ISO con offset -06:00 para evitar derivar a UTC sin control
    const ts = `${day}T${hhmm}:00-06:00`;

    const up = await s
      .from('punches')
      .upsert(
        {
          employee_id,
          workday: day,
          type,
          ts,
          source: 'justification',
        },
        { onConflict: 'employee_id,workday,type,source' }
      )
      .select('id');
    if (up.error) {
      return NextResponse.json({ ok: false, error: up.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, punch_upserted: up.data?.[0]?.id ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
