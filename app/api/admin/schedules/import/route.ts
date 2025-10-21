import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function weekdayToIndex(raw: string): number {
  const v = (raw || '').trim().toLowerCase();
  const map: Record<string, number> = {
    '0': 0, '7': 0,
    'domingo': 0, 'dom': 0, 'sun': 0, 'sunday': 0,
    '1': 1, 'lunes': 1, 'lun': 1, 'mon': 1, 'monday': 1,
    '2': 2, 'martes': 2, 'mar': 2, 'tue': 2, 'tuesday': 2,
    '3': 3, 'miércoles': 3, 'miercoles': 3, 'mié': 3, 'mie': 3, 'wed': 3, 'wednesday': 3,
    '4': 4, 'jueves': 4, 'jue': 4, 'thu': 4, 'thursday': 4,
    '5': 5, 'viernes': 5, 'vie': 5, 'fri': 5, 'friday': 5,
    '6': 6, 'sábado': 6, 'sabado': 6, 'sáb': 6, 'sab': 6, 'sat': 6, 'saturday': 6,
  };
  if (v in map) return map[v];
  const n = Number.parseInt(v, 10);
  if (!Number.isNaN(n)) {
    if (n === 7) return 0;
    if (n >= 0 && n <= 6) return n;
  }
  throw new Error(`weekday inválido: "${raw}" (usa 0-6, 7 para domingo, o nombres como "domingo")`);
}

// CSV esperado: email,weekday,start_time,break_start,break_end,end_time,timezone
export async function POST(req: NextRequest) {
  try {
    const ct = (req.headers.get('content-type') || '').toLowerCase();
    let csvText: string | null = null;

    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (file) {
        csvText = await file.text();
      } else {
        const csv = form.get('csv');
        if (typeof csv === 'string') csvText = csv;
      }
    } else if (ct.includes('text/csv')) {
      csvText = await req.text();
    } else if (ct.includes('application/json')) {
      const body = await req.json();
      if (typeof body?.csv === 'string') csvText = body.csv as string;
    } else {
      // Intento tolerante: si no hay CT, pruebo leer como texto
      const maybe = await req.text();
      csvText = maybe && maybe.trim().length ? maybe : null;
    }

    if (!csvText) {
      return NextResponse.json(
        { ok: false, error: 'Falta CSV. Envia como multipart/form-data (file) o text/csv o JSON {csv}.' },
        { status: 400 }
      );
    }

    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      return NextResponse.json({ ok: false, error: 'CSV vacío' }, { status: 400 });
    }

    // Detectar encabezado
    let startIdx = 0;
    if (/^"?email"?[,;]/i.test(lines[0])) startIdx = 1;

    const s = supabaseService();

    // Cache email -> id
    const emailToId = new Map<string, string>();
    const results: Array<{ email: string; weekday: number; status: 'inserted' | 'updated' }> = [];

    for (let i = startIdx; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw) continue;

      // Split sencillo por coma (si llegan comas escapadas, podemos cambiar a PapaParse)
      const parts = raw.split(',').map(x => x.trim());
      const [email, weekdayRaw, start_time, break_start, break_end, end_time, timezone] = parts;

      if (!email || !weekdayRaw) continue;

      // Buscar profile
      let employee_id = emailToId.get(email);
      if (!employee_id) {
        const q = await s.from('profiles').select('id').eq('email', email).maybeSingle();
        if (q.error && q.error.code !== 'PGRST116') {
          return NextResponse.json({ ok: false, error: `Fila ${i + 1}: ${q.error.message}` }, { status: 400 });
        }
        if (!q.data?.id) continue; // omitir si no hay perfil
        employee_id = q.data.id as string;
        emailToId.set(email, employee_id);
      }

      let weekday = 0;
      try { weekday = weekdayToIndex(weekdayRaw); }
      catch (e: any) {
        return NextResponse.json({ ok: false, error: `Fila ${i + 1}: ${e?.message || e}` }, { status: 400 });
      }

      // Upsert MANUAL por (employee_id, weekday)
      const existing = await s
        .from('work_schedules')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('weekday', weekday)
        .maybeSingle();

      if (existing.error && existing.error.code !== 'PGRST116') {
        return NextResponse.json({ ok: false, error: `Fila ${i + 1}: ${existing.error.message}` }, { status: 400 });
      }

      if (existing.data?.id) {
        const upd = await s
          .from('work_schedules')
          .update({
            start_time: start_time || null,
            break_start: break_start || null,
            break_end: break_end || null,
            end_time: end_time || null,
            timezone: timezone || 'America/Mexico_City',
          })
          .eq('id', existing.data.id)
          .select('id')
          .single();

        if (upd.error) {
          return NextResponse.json({ ok: false, error: `Fila ${i + 1}: ${upd.error.message}` }, { status: 400 });
        }
        results.push({ email, weekday, status: 'updated' });
      } else {
        const ins2 = await s
          .from('work_schedules')
          .insert({
            employee_id,
            weekday,
            start_time: start_time || null,
            break_start: break_start || null,
            break_end: break_end || null,
            end_time: end_time || null,
            timezone: timezone || 'America/Mexico_City',
          })
          .select('id')
          .single();

        if (ins2.error) {
          return NextResponse.json({ ok: false, error: `Fila ${i + 1}: ${ins2.error.message}` }, { status: 400 });
        }
        results.push({ email, weekday, status: 'inserted' });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
