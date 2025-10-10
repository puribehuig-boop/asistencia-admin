'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Role = 'admin' | 'employee' | 'nomina';
type Status = 'active' | 'inactive';

type Row = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: Status;
};

export default function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [nipById, setNipById] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const load = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status')
      .order('email', { ascending: true });

    if (error) {
      setMsg('Error cargando usuarios: ' + error.message);
      return;
    }
    setRows((data || []) as Row[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const invite = async () => {
    setMsg('');
    const res = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, role }),
    });
    const json = await res.json();
    if (!json.ok) {
      setMsg('Error: ' + json.error);
      return;
    }
    setMsg('Invitación enviada.');
    setEmail('');
    setName('');
    await load();
  };

  const setStatus = async (id: string, status: Status) => {
    setMsg('');
    const res = await fetch('/api/admin/users/set-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, status }),
    });
    const json = await res.json();
    if (!json.ok) setMsg('Error: ' + json.error);
    else await load();
  };

  const setRoleFn = async (id: string, r: Role) => {
    setMsg('');
    const res = await fetch('/api/admin/users/set-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, role: r }),
    });
    const json = await res.json();
    if (!json.ok) setMsg('Error: ' + json.error);
    else await load();
  };

  const resetPwd = async (email: string) => {
    setMsg('');
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!json.ok) setMsg('Error: ' + json.error);
    else setMsg('Link de recuperación: ' + json.link);
  };

  const resetNip = async (id: string) => {
    setMsg('');
    const nip = (nipById[id] || '').trim();
    if (!nip) { setMsg('Ingresa un NIP para ese usuario.'); return; }
    const res = await fetch('/api/admin/users/reset-nip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id, nip }),
    });
    const json = await res.json();
    if (!json.ok) setMsg('Error: ' + json.error);
    else {
      setMsg('NIP actualizado.');
      setNipById((prev) => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <main className="space-y-6">
      <section className="border rounded p-4 space-y-2">
        <h2 className="font-semibold">Invitar usuario</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            className="border p-2 rounded"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="employee">Empleado</option>
            <option value="admin">Admin</option>
            <option value="nomina">Nómina</option>
          </select>
          <button className="bg-black text-white rounded p-2" onClick={invite}>
            Invitar
          </button>
        </div>
      </section>

      <section className="border rounded p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Nombre</th>
              <th className="p-2">Rol</th>
              <th className="p-2">Estado</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.full_name || '-'}</td>
                <td className="p-2">
                  <select
                    className="border p-1 rounded"
                    value={r.role}
                    onChange={(e) => setRoleFn(r.id, e.target.value as Role)}
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Admin</option>
                    <option value="nomina">Nómina</option>
                  </select>
                </td>
                <td className="p-2">
                  <button
                    className="border rounded px-2 py-1"
                    onClick={() => setStatus(r.id, r.status === 'active' ? 'inactive' : 'active')}
                  >
                    {r.status === 'active' ? 'Pausar' : 'Activar'}
                  </button>
                </td>
                <td className="p-2 space-x-2">
                  <button
                    className="border rounded px-2 py-1"
                    onClick={() => resetPwd(r.email)}
                  >
                    Reset password
                  </button>
                  <input
                    className="border p-1 rounded w-24"
                    placeholder="Nuevo NIP"
                    value={nipById[r.id] || ''}
                    onChange={(e) =>
                      setNipById((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  />
                  <button
                    className="border rounded px-2 py-1"
                    onClick={() => resetNip(r.id)}
                  >
                    Set NIP
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2" colSpan={5}>
                  Sin usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
