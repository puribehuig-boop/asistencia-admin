import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


export async function POST(req: NextRequest) {
const { type, nip, lat, lng, accuracy_m, device_id, ua } = await req.json();
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
});


const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || '';


const { data, error } = await supabase.rpc('punch_create', { p_type: type, nip, lat, lng, accuracy_m, device_id, ip, ua });
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
return NextResponse.json({ ok: true, punch: data });
}
