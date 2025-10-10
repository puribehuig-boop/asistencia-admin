'use client';
if (!email) { setMsg('Ingresa tu correo para enviar el enlace de recuperación.'); return; }
setMsg(null); setBusy(true);
const origin = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/reset` });
setBusy(false);
setMsg(error ? error.message : 'Te enviamos un correo para restablecer tu contraseña.');
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
<input
className="w-full border p-2 rounded"
placeholder="Contraseña"
value={password}
onChange={(e) => setPassword(e.target.value)}
type="password"
/>
<button disabled={busy} onClick={signIn} className="w-full bg-black text-white p-2 rounded disabled:opacity-50">Entrar</button>
<button type="button" onClick={reset} className="w-full border p-2 rounded">Olvidé mi contraseña</button>
{msg && <p className="text-sm">{msg}</p>}
</main>
);
}
```tsx
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
