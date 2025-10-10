'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Punch = {
  employee_id: string;
  type: 'start_day' | 'start_break' | 'end_break' | 'end_day';
  ts: string;       // ISO
  workday: string;  // YYYY-MM-DD
};

type WS = {
  employee_id: string;
  weekday: number; // 0..6 (Dom..Sáb)
  start_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  end_time?: string | null;
  timezone?: string | null;
};

type Row = {
  employee_id: string;
  email: string;
  day: string;  // YYYY-MM-DD
  // reales
  start_day?: string;
  start_break?: string;
  end_break?: string;
  end_day?: string;
  hours_worked: number; // real (h)
  // teóricos (del horario)
  ws_start?: string | null;
  ws_break_start?: string | null;
  ws_break_end?: string | null;
  ws_end?: string | null;
  ws_hours: number; // teórico (h)
  // diferencia (real - teórico)
  diff_hours: number;
};

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtTeorico = (r: Row) => {
  const core = r.ws_start && r.ws_end ? `${r.ws_start}–${r.ws_end}` : '—';
  const brk =
    r.ws_break_start && r.ws_break_end ? ` (Desc: ${r.ws_break_start}–${r.ws_break_end})` : '';
  return core + brk;
};

// HH:MM[:SS] -> minutos
const timeToMinutes = (t?: string | null) => {
  if (!t) return undefined;
  const [hh, mm = '0', ss = '0'] = t.split(':');
  const h = Number(hh), m = Number(mm), s = Number(ss);
  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return undefined;
  return h * 60 + m + Math.floor(s / 60);
};

const scheduleHours = (ws?: WS) => {
  if (!ws?.start_time || !ws?.end_time) return 0;
  const s = timeToMinutes(ws.start_time);
  const e = timeToMinutes(ws.end_time);
  if (s === undefined || e === undefined || e <= s) return 0;
  let total = e - s;
  const bs = timeToMinutes(ws.break_start);
  const be = timeToMinutes(ws.break_end);
  if (bs !== undefined && be !== undefined && be > bs) total -= (be - bs);
  return total / 60; // horas
};

type Period = 'semana' | 'mes' | 'quincena';

const periodKey = (dayISO: string, type: Period) => {
  const d = new Date(dayISO + 'T00:00:00');
  if (type === 'mes') {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }
  if (type === 'quincena') {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const q = d.getDate() <= 15 ? 'Q1' : 'Q2';
    return `${y}-${m}-${q}`;
  }
  // semana ISO aproximada (simple; suficiente para nómina)
  const ref = new Date(d);
  const day = (d.getDay() + 6) % 7; // 0..6, 0=lunes
  ref.setDate(d.getDate() - day);
  const y = ref.getFullYear();
  // número de semana: contar semanas desde el 1º de enero (lunes=0)
  const jan1 = new Date(y, 0, 1);
  const jan1Day = (jan1.getDay() + 6) % 7;
  const diffDays = Math.floor((+ref - +jan1) / (1000 * 60 * 60 * 24));
  const week = Math.floor((diffDays + jan1Day) / 7) + 1;
  return `${y}-W${String(week).padStart(2, '0')}`;
};

export default function AdminAsistencia() {
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');
  const [raw, setRaw] = useState<Punch[]>([]);
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [schedules, setSchedules] = useState<WS[]>([]);
  const [msg, setMsg] = useState<string>('');
  const [period, setPeriod] = useState<Period>('semana');

  // Perfiles para mapear employee_id -> email
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
    let q = supabase
      .from('punches')
      .select('employee_id,type,ts,workday')
      .order('workday', { ascending: true })
      .order('ts', { ascending: true });

    if (from) q = q.gte('workday', from);
    if (to) q = q.lte('workday', to);

    const [{ data, error }, wsRes] = await Promise.all([
      q,
      supabase
        .from('work_schedules')
        .select('employee_id,weekday,start_time,break_start,break_end,end_time,timezone'),
    ]);

    if (error) { setMsg('Error: ' + error.message); return; }
    setRaw((data || []) as Punch[]);
    setSchedules((wsRes.data || []) as WS[]);
  };

  // inicial
  useEffect(() => { void load(); }, []);

  // Index de horarios por empleado+weekday
  const wsIndex = useMemo(() => {
    const m = new Map<string, WS>();
    for (const ws of schedules) {
      m.set(`${ws.employee_id}-${ws.weekday}`, ws);
    }
    return m;
  }, [schedules]);

  // Agregación por empleado + día e inyección de teóricos
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
          ws_hours: 0,
          diff_hours: 0,
        });
      }
      const r = byKey.get(key)!;
      if (p.type === 'start_day') r.start_day = p.ts;
      else if (p.type === 'start_break') r.start_break = p.ts;
      else if (p.type === 'end_break') r.end_break = p.ts;
      else if (p.type === 'end_day') r.end_day = p.ts;
    }

    // calcula horas reales y teóricas + diferencia
    for (const r of byKey.values()) {
      // reales
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

      // teóricos (por weekday)
      const weekday = new Date(r.day + 'T00:00:00').getDay(); // 0..6 (Dom..Sáb)
      const ws = wsIndex.get(`${r.employee_id}-${weekday}`);
      r.ws_start = ws?.start_time ?? null;
      r.ws_break_start = ws?.break_start ?? null;
      r.ws_break_end = ws?.break_end ?? null;
      r.ws_end = ws?.end_time ?? null;
      r.ws_hours = scheduleHours(ws);

      // diferencia (real - teórico)
      r.diff_hours = (r.hours_worked || 0) - (r.ws_hours || 0);
    }

    let list = Array.from(byKey.values()).sort((a, b) =>
      a.day === b.day ? a.email.localeCompare(b.email) : a.day.localeCompare(b.day)
    );

    if (emailFilter.trim()) {
      const f = emailFilter.trim().toLowerCase();
      list = list.filter((r) => r.email.toLowerCase().includes(f));
    }

    return list;
  }, [raw, emails, emailFilter, wsIndex]);

  // Acumulados por empleado y periodo
  const totals = useMemo(() => {
    const byKey = new Map<string, { email: string; period: string; real: number; teorico: number; diff: number }>();
    for (const r of rows) {
      const k = `${r.email}__${periodKey(r.day, period)}`;
      if (!byKey.has(k)) {
        byKey.set(k, { email: r.email, period: periodKey(r.day, period), real: 0, teorico: 0, diff: 0 });
      }
      const agg = byKey.get(k)!;
      agg.real += r.hours_worked || 0;
      agg.teorico += r.ws_hours || 0;
      agg.diff = agg.real - agg.teorico;
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.email === b.email ? a.period.localeCompare(b.period) : a.email.localeCompare(b.email)
    );
  }, [rows, period]);

  return (
    <main className="space-y-5">
      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
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
        <select
          className="border p-2 rounded"
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          title="Periodo para acumulados"
        >
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
          <option value="quincena">Quincena</option>
        </select>
        <button className="border rounded px-3" onClick={load}>
          Aplicar filtros
        </button>
      </div>

      {/* Tabla diaria real vs teórico */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Día</th>
              <th className="p-2">Inicio (real)</th>
              <th className="p-2">Descanso (real)</th>
              <th className="p-2">Fin descanso (real)</th>
              <th className="p-2">Fin (real)</th>
              <th className="p-2">Horas (real)</th>
              <th className="p-2">Teórico</th>
              <th className="p-2">Horas Teóricas</th>
              <th className="p-2">Diferencia</th>
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
                <td className="p-2">{fmtTeorico(r)}</td>
                <td className="p-2">{r.ws_hours.toFixed(2)}</td>
                <td className={`p-2 ${r.diff_hours < 0 ? 'text-red-600' : r.diff_hours > 0 ? 'text-green-600' : ''}`}>
                  {r.diff_hours.toFixed(2)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-2" colSpan={10}>
                  Sin datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Acumulados por empleado */}
      <section className="border rounded p-3 space-y-2">
        <h3 className="font-semibold">Acumulados por empleado ({period})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2">Email</th>
                <th className="p-2">Periodo</th>
                <th className="p-2">Horas (real)</th>
                <th className="p-2">Horas Teóricas</th>
                <th className="p-2">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={`${t.email}-${t.period}`} className="border-t">
                  <td className="p-2">{t.email}</td>
                  <td className="p-2">{t.period}</td>
                  <td className="p-2">{t.real.toFixed(2)}</td>
                  <td className="p-2">{t.teorico.toFixed(2)}</td>
                  <td className={`p-2 ${t.diff < 0 ? 'text-red-600' : t.diff > 0 ? 'text-green-600' : ''}`}>
                    {t.diff.toFixed(2)}
                  </td>
                </tr>
              ))}
              {totals.length === 0 && (
                <tr>
                  <td className="p-2" colSpan={5}>Sin datos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
