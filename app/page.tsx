'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';


export default function Home() {
const router = useRouter();
const [loading, setLoading] = useState(true);


useEffect(() => {
(async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) { router.replace('/login'); return; }
const { data, error } = await supabase
.from('profiles')
.select('role')
.eq('id', session.user.id)
.maybeSingle();
if (error || !data) { router.replace('/login'); return; }
router.replace(data.role === 'admin' ? '/admin' : '/empleado');
setLoading(false);
})();
}, [router]);


return <main className="p-6">{loading ? 'Cargando…' : null}</main>;
}
