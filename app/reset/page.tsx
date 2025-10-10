'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';


export default function ResetPage() {
const [password, setPassword] = useState('');
const [confirm, setConfirm] = useState('');
const [msg, setMsg] = useState<string|null>(null);
const [ready, setReady] = useState(false);
const router = useRouter();


useEffect(() => {
(async ()=> {
const { data: { session } } = await supabase.auth.getSession();
if (!session?.user) {
setTimeout(async () => {
const { data: { session: s2 } } = await supabase.auth.getSession();
if (s2?.user) setReady(true); else setMsg('Enlace inválido o expirado. Solicita otro desde /login.');
}, 1200);
} else {
setReady(true);
}
})();
}, []);


const submit = async () => {
if (!password || password !== confirm) { setMsg('Las contraseñas no coinciden.'); return; }
const { error } = await supabase.auth.updateUser({ password });
if (error) { setMsg(error.message); return; }
setMsg('Contraseña actualizada. Redirigiendo…');
setTimeout(()=> router.replace('/'), 800);
};


if (!ready) return <main className="p-6">Preparando restablecimiento…</main>;


return (
<main className="max-w-md mx-auto p-6 space-y-4">
<h1 className="text-2xl font-semibold">Nueva contraseña</h1>
<input className="w-full border p-2 rounded" placeholder="Nueva contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
<input className="w-full border p-2 rounded" placeholder="Confirmar contraseña" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} />
<button onClick={submit} className="w-full bg-black text-white p-2 rounded">Guardar</button>
{msg && <p className="text-sm">{msg}</p>}
</main>
);
}
