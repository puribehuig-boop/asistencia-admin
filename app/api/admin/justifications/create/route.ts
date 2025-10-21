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

    // 2) Refleja la justificación como "punch" (source='justification'), upsert MANUAL
    const day = String(body.day);
    const hhmm = String(body.new_time);
    const type = String(body.field) as 'start_day'|'start_break'|'end_break'|'end_day';
    const employee_id = String(body.employee_id);

    // Guardamos como hora local CDMX (offset fijo -06:00 para este proyecto)
    const ts = `${day}T${hhmm}:00-06:00`;

    // ¿Existe ya un punch de justificación para (empleado, día, tipo)?
    const existing = await s
      .from('punches')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('workday', day)
      .eq('type', type)
      .eq('source', 'justification')
      .maybeSingle();

    if (existing.error && existing.error.code !== 'PGRST116') {
      // PGRST116 = No rows found for maybeSingle (ok)
      return NextResponse.json({ ok: false, error: existing.error.message }, { status: 400 });
    }

    if (existing.data?.id) {
      // UPDATE
      const upd = await s
        .from('punches')
        .update({ ts })
        .eq('id', existing.data.id)
        .select('id')
        .single();
      if (upd.error) {
        return NextResponse.json({ ok: false, error: upd.error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, punch_id: upd.data.id, mode: 'updated' });
    } else {
      // INSERT
      const insPunch = await s
        .from('punches')
        .insert({
          employee_id,
          workday: day,
          type,
          ts,
          source: 'justification',
        })
        .select('id')
        .single();
      if (insPunch.error) {
        return NextResponse.json({ ok: false, error: insPunch.error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, punch_id: insPunch.data.id, mode: 'inserted' });
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
