import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';


export async function POST(req: NextRequest) {
const { email } = await req.json();
const s = supabaseService();
const { data, error } = await s.auth.admin.generateLink({ type: 'recovery', email });
if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
// Puedes enviar data.properties.action_link por correo con tu propio SMTP si quieres
return NextResponse.json({ ok: true, link: data.properties.action_link });
}
