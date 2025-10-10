// lib/supabaseService.ts
import { createClient } from '@supabase/supabase-js';


export function supabaseService() {
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE!; // server-only
return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
