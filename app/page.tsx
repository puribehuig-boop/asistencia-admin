'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let unsub: { data?: { subscription?: { unsubscribe?: () => void } } } | null = null;

    const routeByRole = async (uid: string) => {
      // intenta leer el perfil (puede tardar un instante en crearse vía trigger)
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .maybeSingle();
        if (data?.role) {
          router.replace(data.role === 'admin' ? '/admin' : '/empleado');
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      // fallback razonable
      router.replace('/empleado');
    };

    const init = async () => {
      const comingFromHash =
        typeof window !== 'undefined' &&
        (location.hash.includes('access_token') ||
          location.hash.includes('refresh_token') ||
          location.hash.includes('type=signup') ||
          location.hash.includes('type=recovery'));

      if (comingFromHash) {
        // Espera a que Supabase consuma el hash y emita SIGNED_IN
        unsub = supabase.auth.onAuthStateChange((_evt, session) => {
          if (session?.user?.id) routeByRole(session.user.id);
        });

        // Fallback por si el evento tarda (1.5s)
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) routeByRole(session.user.id);
        }, 1500);
        return;
      }

      // Flujo normal (sin hash)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.replace('/login');
        return;
      }
      routeByRole(session.user.id);
    };

    init();
    return () => unsub?.data?.subscription?.unsubscribe?.();
  }, [router]);

  return <main className="p-6">Cargando…</main>;
}
