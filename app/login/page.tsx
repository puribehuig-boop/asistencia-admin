'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) router.replace('/');
    })();
  }, [router]);

  const signIn = async () => {
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    router.replace('/');
  };

  const reset = async () => {
    if (!email) { setMsg('Ingresa tu correo para enviar el enlace de recuperación.'); return; }
    setMsg(null);
    setBusy(true);
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
        autoComplete="username"
      />

      <input
        className="w-full border p-2 rounded"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        autoComplete="current-password"
      />

      <button
        disabled={busy}
        onClick={signIn}
        className="w-full bg-black text-white p-2 rounded disabled:opacity-50"
      >
        Entrar
      </button>

      <button
        type="button"
        onClick={reset}
        className="w-full border p-2 rounded"
      >
        Olvidé mi contraseña
      </button>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
