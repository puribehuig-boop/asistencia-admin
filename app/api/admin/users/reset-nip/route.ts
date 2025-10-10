import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';


export async function POST(req: NextRequest) {
const { user_id, nip } = await req.json();
const s = supabaseService();
// usa RPC admin (no depende de auth.uid)
const { error } = await s.rpc('admin_set_employee_nip', { emp_id: user_id, new_nip: nip });
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
return NextResponse.json({ ok: true });
}
