import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';


/* Espera JSON: [{ email, weekday, start_time, break_start, break_end, end_time, timezone? }, ...] */
export async function POST(req: NextRequest) {
const rows = await req.json();
const s = supabaseService();


// mapear email → user_id
const emails = [...new Set(rows.map((r: any) => r.email))];
const { data: profs, error: e1 } = await s.from('profiles').select('id,email').in('email', emails);
if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });
const idByEmail = new Map<string, string>(profs.map(p => [p.email, p.id]));


const upserts = rows.map((r: any) => ({
employee_id: idByEmail.get(r.email),
weekday: Number(r.weekday),
start_time: r.start_time ?? null,
break_start: r.break_start ?? null,
break_end: r.break_end ?? null,
end_time: r.end_time ?? null,
timezone: r.timezone ?? 'America/Mexico_City'
})).filter((r: any) => !!r.employee_id && r.weekday >= 0 && r.weekday <= 6);


if (upserts.length === 0) return NextResponse.json({ ok: false, error: 'No hay filas válidas.' }, { status: 400 });


const { error } = await s.from('work_schedules').upsert(upserts, { onConflict: 'employee_id,weekday' });
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
return NextResponse.json({ ok: true, count: upserts.length });
}
