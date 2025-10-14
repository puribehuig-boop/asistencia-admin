import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { from, to, employee_ids } = await req.json();
    if (!from || !to) {
      return NextResponse.json({ ok: false, error: 'from/to requeridos' }, { status: 400 });
    }

    const s = supabaseService();

    let q = s
      .from('justifications')
      .select('employee_id,day,field,new_time,evidence_path,status')
      .eq('status', 'approved')
      .gte('day', from)
      .lte('day', to);

    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      q = q.in('employee_id', employee_ids);
    }

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, items: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
