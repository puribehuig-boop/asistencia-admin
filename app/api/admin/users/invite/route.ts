import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';


export async function POST(req: NextRequest) {
const { email, full_name, role = 'employee' } = await req.json();
const s = supabaseService();


// Invitar usuario
const { data, error } = await s.auth.admin.inviteUserByEmail(email, { data: { full_name } });
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });


const user = data.user;


// Backfill en tablas públicas
await s.from('profiles').upsert({ id: user.id, email, full_name, role, status: 'active' });
await s.from('employees').upsert({ id: user.id, profile_id: user.id });


return NextResponse.json({ ok: true, user });
}
