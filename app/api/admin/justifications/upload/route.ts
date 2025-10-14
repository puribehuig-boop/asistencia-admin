import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ ok: false, error: 'Falta NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE) {
      return NextResponse.json({ ok: false, error: 'Falta SUPABASE_SERVICE_ROLE' }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const employee_id = String(form.get('employee_id') || '');
    const day = String(form.get('day') || '');

    if (!file) return NextResponse.json({ ok: false, error: 'Archivo requerido' }, { status: 400 });
    if (!employee_id || !day) return NextResponse.json({ ok: false, error: 'employee_id y day requeridos' }, { status: 400 });

    const arr = Buffer.from(await file.arrayBuffer());
    const path = `justifications/${employee_id}/${day}/${Date.now()}_${file.name}`;

    const s = supabaseService();
    const { data, error } = await s.storage.from('justifications').upload(path, arr, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, path: data?.path || path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
