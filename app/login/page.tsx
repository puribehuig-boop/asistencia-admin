'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export default function LoginPage() {
const [email, setEmail] = useState('');
const [sent, setSent] = useState(false);
const [error, setError] = useState<string|null>(null);


const sendMagic = async () => {
setError(null);
const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
if (error) setError(error.message); else setSent(true);
};


return (
<main className="max-w-md mx-auto p-6 space-y-4">
<h1 className="text-2xl font-semibold">Entrar</h1>
<input
className="w-full border p-2 rounded"
placeholder="correo@ejemplo.com"
value={email}
onChange={(e) => setEmail(e.target.value)}
type="email"
/>
<button onClick={sendMagic} className="w-full bg-black text-white p-2 rounded">Enviar enlace</button>
{sent && <p>Revisa tu correo para continuar.</p>}
{error && <p className="text-red-600">{error}</p>}
</main>
);
}
