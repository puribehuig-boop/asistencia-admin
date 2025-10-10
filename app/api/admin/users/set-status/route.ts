import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';


export async function POST(req: NextRequest) {
const { user_id, status } = await req.json(); // 'active' | 'inactive'
const s = supabaseService();
const { error } = await s.from('profiles').update({ status }).eq('id', user_id);
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
return NextResponse.json({ ok: true });
}
