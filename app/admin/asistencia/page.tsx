'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Punch = {
  employee_id: string;
  type: 'start_day' | 'start_break' | 'end_break' | 'end_day';
  ts: string;       // ISO
  workday: string;  // YYYY-MM-DD
};

type Row = {
  employee_id: string;
  email: string;
  day: string;  // YYYY-MM-DD
  start_day?: string;
  start_break?: string;
  end_break?: string;
  end_day?: string;
  hours_worked: number; // en horas
};

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function AdminAsistencia() {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [raw, setRaw] = useState<Punch[]>([]);
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [msg, setMsg] = useState<string>('');

  // Carga perfiles para mapear employee_id -> email
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('profiles').select('id,email');
      if (!error && data) {
        setEmails(new Map<string, string>(data.map((p: any) => [p.id, p.email])));
      }
    })();
  }, []);

  const load = async () => {
    setMsg('');
    let q = supabase.from('punches')
      .select('employee_id,type,ts,workday')
      .order('workday', { ascending: true })
      .order('ts', { ascending: true });

    if (from) q = q.gte('workday', from);
    if (to) q = q.lte('workday', to);

    const { data, error } = await q;
    if (error) { setMsg('Error: ' + error.message); return; }
    setRaw((data || []) as Punch[]);
  };

  // Carga inicial
  useEffect(() => { void load(); }, []);

  // Agregación: por empleado + día
  const rows: Row[] = useMemo(() => {
    const byKey = new Map<string, Row>();

    for (const p of raw) {
      const key = `${p.employee_id}-${p.workday}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          employee_id: p.employee_id,
          email: emails.get(p.employee_id) || p.employee_id,
          day: p.workday,
          hours_worked: 0,
        });
      }
      const r = byKey.get(key)!;
      if (p.type === 'start_day') r.start_day = p.ts;
      else if (p.type === 'start_break') r.start_break = p.ts;
      else if (p.type === 'end_break') r.end_break = p.ts;
      else if (p.type === 'end_day') r.end_day = p.ts;
    }

    // calcula horas trabajadas = (end_day - start_day) - (end_break - start_break)
    for (const r of byKey.values()) {
      const sd = r.start_day ? new Date(r.start_day).getTime() : undefined;
      const ed = r.end_day ? new Date(r.end_day).getTime() : undefined;
      const sb = r.start_break ? new Date(r.start_break).getTime() : undefined;
      const eb = r.end_break ? new Date(r.end_break).getTime() : undefined;

      let totalMs = 0;
      if (sd && ed && ed > sd) {
        totalMs = ed - sd;
        if (sb && eb && eb > sb) totalMs -= (eb - sb);
      }
      r.hours_worked = totalMs / (1000 * 60 * 60);
    }

    let list = Array.from(byKey.values()).sort((a, b) =>
      a.day === b.day ? a.email.localeCompare(b.email) : a.day.localeCompare(b.day)
    );

    if (emailFilter.trim()) {
      const f = emailFilter.trim().toLowerCase();
      list = list.filter(r => r.email.toLowerCase().includes(f));
    }

    return list;
  }, [raw, emails, emailFilter]);

  return (
    <main className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          className="border p-2 rounded"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="filtrar por email (opcional)"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
        />
        <button className="border rounded px-3" onClick={load}>
          Aplicar filtros
        </button>
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Día</th>
              <th className="p-2">Inicio</th>
              <th className="p-2">Descanso</th>
              <th className="p-2">Fin descanso</th>
              <th className="p-2">Fin</th>
              <th className="p-2">Horas</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.employee_id}-${r.day}`} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.day}</td>
                <td className="p-2">{fmtTime(r.start_day)}</td>
                <td className="p-2">{fmtTime(r.start_break)}</td>
                <td className="p-2">{fmtTime(r.end_break)}</td>
                <td className="p-2">{fmtTime(r.end_day)}</td>
                <td className="p-2">{r.hours_worked.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2" colSpan={7}>
                  Sin datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
