'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'employee';
};

export default function AdminPage() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      // Verifica que seas admin
      const { data: me, error: meErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (meErr || !me || me.role !== 'admin') { window.location.href = '/'; return; }

      // Carga listado de perfiles (sin relaciones para simplificar)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .order('email', { ascending: true });

      if (!error && data) setRows(data as ProfileRow[]);
      setLoading(false);
    })();
  }, []);

  const setNip = async (empId: string) => {
    const nip = prompt('Nuevo NIP (se guardará en hash)');
    if (!nip) return;
    const { error } = await supabase.rpc('set_employee_nip', { emp_id: empId, new_nip: nip });
    if (error) alert('Error: ' + error.message);
    else alert('NIP actualizado');
  };

  if (loading) return <main className="p-6">Cargando…</main>;

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.full_name || '-'}</td>
                <td className="p-2">{r.role}</td>
                <td className="p-2">
                  <button
                    className="px-2 py-1 border rounded"
                    onClick={() => setNip(r.id)}
                  >
                    Set NIP
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2" colSpan={4}>Sin registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
