import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

/**
 * Espera JSON: [{ email, weekday, start_time?, break_start?, break_end?, end_time?, timezone? }, ...]
 * Devuelve siempre JSON { ok: boolean, count?: number, error?: string }
 */
export async function POST(req: NextRequest) {
  try {
    let rows: any;
    try {
      rows = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Cuerpo no es JSON válido.' }, { status: 400 });
    }
    if (!Array.isArray(rows)) {
      return NextResponse.json({ ok: false, error: 'Se esperaba un arreglo JSON.' }, { status: 400 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Sin filas para importar.' }, { status: 400 });
    }

    const s = supabaseService();

    // mapear email → user_id
    const emails = [...new Set(rows.map((r: any) => (r?.email || '').toLowerCase()).filter(Boolean))];
    const { data: profs, error: e1 } = await s.from('profiles').select('id,email').in('email', emails);
    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

    const idByEmail = new Map<string, string>((profs || []).map((p: any) => [p.email.toLowerCase(), p.id]));

    const upserts = rows
      .map((r: any) => ({
        employee_id: idByEmail.get(String(r.email || '').toLowerCase()),
        weekday: Number(r.weekday),
        start_time: r.start_time ?? null,
        break_start: r.break_start ?? null,
        break_end: r.break_end ?? null,
        end_time: r.end_time ?? null,
        timezone: r.timezone ?? 'America/Mexico_City',
      }))
      .filter((r: any) => !!r.employee_id && r.weekday >= 0 && r.weekday <= 6);

    if (upserts.length === 0) {
      return NextResponse.json({ ok: false, error: 'No se encontraron filas válidas.' }, { status: 400 });
    }

    const { error } = await s
      .from('work_schedules')
      .upsert(upserts, { onConflict: 'employee_id,weekday' });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, count: upserts.length });
  } catch (e: any) {
    // Captura cualquier error inesperado y asegura JSON
    const msg = e?.message || String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
