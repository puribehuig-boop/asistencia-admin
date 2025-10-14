'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import JustifyModal from '@/components/JustifyModal';

type BtnPeriod = 'semana' | 'mes' | 'quincena' | 'personalizado';

type Punch = {
  employee_id: string;
  type: 'start_day' | 'start_break' | 'end_break' | 'end_day';
  ts: string;
  workday: string;  // YYYY-MM-DD
};

type Schedule = {
  employee_id: string;
  weekday: number;
  start_time: string | null;
  break_start: string | null;
  break_end: string | null;
  end_time: string | null;
  timezone?: string | null;
};

type Justif = {
  employee_id: string;
  day: string; // YYYY-MM-DD
  field: 'start_day' | 'start_break' | 'end_break' | 'end_day';
  new_time: string; // HH:MM
  evidence_path?: string | null;
  status: 'approved' | 'pending' | 'rejected';
};

type Row = {
  employee_id: string;
  email: string;
  day: string;
  start_day?: string;
  start_break?: string;
  end_break?: string;
  end_day?: string;
  sched?: Pick<Schedule, 'start_time' | 'break_start' | 'break_end' | 'end_time' | 'timezone'>;
  hours_worked: number;
  theo_hours: number;
  diff_hours: number;
};

const TZ = 'America/Mexico_City';
const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtTeorico = (s?: Row['sched']) => {
  if (!s?.start_time || !s.end_time) return '—';
  const base = `${s.start_time.slice(0,5)}–${s.end_time.slice(0,5)}`;
  const b = s.break_start?.slice(0,5);
  const e = s.break_end?.slice(0,5);
  return b && e ? `${base} (descanso ${b}–${e})` : base;
};

const timeToMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const theoreticalHours = (s?: Row['sched']) => {
  if (!s?.start_time || !s.end_time) return 0;
  const start = timeToMinutes(s.start_time)!;
  const end = timeToMinutes(s.end_time)!;
  let mins = end - start;
  if (mins < 0) mins += 24 * 60;
  const bs = timeToMinutes(s.break_start);
  const be = timeToMinutes(s.break_end);
  if (bs != null && be != null) {
    let rest = be - bs;
    if (rest < 0) rest += 24 * 60;
    mins -= rest;
  }
  return Math.max(0, mins) / 60;
};

const toYMD = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const startOfWeekMon = (d: Date) => { const x = new Date(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1 - day); x.setDate(x.getDate() + diff); x.setHours(0,0,0,0); return x; };
const endOfWeekSun = (d: Date) => { const start = startOfWeekMon(d); const end = new Date(start); end.setDate(start.getDate() + 6); return end; };
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const quincenaRange = (d: Date): [Date, Date] => d.getDate() <= 15
  ? [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth(), 15)]
  : [new Date(d.getFullYear(), d.getMonth(), 16), endOfMonth(d)];

const daysBetween = (fromYmd: string, toYmd: string): string[] => {
  if (!fromYmd || !toYmd) return [];
  const res: string[] = [];
  const a = new Date(fromYmd + 'T00:00:00');
  const b = new Date(toYmd + 'T00:00:00');
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) res.push(toYMD(d));
  return res;
};

export default function AdminAsistencia() {
  const [from, setFrom] = useState<string>(''); const [to, setTo] = useState<string>('');
  const [period, setPeriod] = useState<BtnPeriod>('semana');
  const [emailFilter, setEmailFilter] = useState<string>('');

  const [raw, setRaw] = useState<Punch[]>([]);
  const [emails, setEmails] = useState<Map<string, string>>(new Map());
  const [schedMap, setSchedMap] = useState<Map<string, Schedule>>(new Map());
  const [employeesWithSched, setEmployeesWithSched] = useState<Set<string>>(new Set());
  const [justMap, setJustMap] = useState<Map<string, Justif>>(new Map());
  const [msg, setMsg] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalInfo, setModalInfo] = useState<{ employee_id: string; email: string; day: string } | null>(null);

  useEffect(() => { (async () => {
    const { data } = await supabase.from('profiles').select('id,email');
    if (data) setEmails(new Map<string, string>(data.map((p: any) => [p.id, p.email])));
  })(); }, []);

  useEffect(() => { (async () => {
    const { data } = await supabase.from('work_schedules')
      .select('employee_id,weekday,start_time,break_start,break_end,end_time,timezone');
    if (data) {
      const m = new Map<string, Schedule>(); const empSet = new Set<string>();
      (data as Schedule[]).forEach((s) => { m.set(`${s.employee_id}-${s.weekday}`, s); empSet.add(s.employee_id); });
      setSchedMap(m); setEmployeesWithSched(empSet);
    }
  })(); }, []);

  useEffect(() => { const now = new Date(); setFrom(toYMD(startOfWeekMon(now))); setTo(toYMD(endOfWeekSun(now))); }, []);
  const applyPeriod = (p: BtnPeriod) => { setPeriod(p); const now = new Date();
    if (p==='semana'){ setFrom(toYMD(startOfWeekMon(now))); setTo(toYMD(endOfWeekSun(now))); }
    else if(p==='mes'){ setFrom(toYMD(startOfMonth(now))); setTo(toYMD(endOfMonth(now))); }
    else if(p==='quincena'){ const [a,b]=quincenaRange(now); setFrom(toYMD(a)); setTo(toYMD(b)); }
  };

  const load = async () => {
    setMsg('');
    let q = supabase.from('punches').select('employee_id,type,ts,workday').order('workday',{ascending:true}).order('ts',{ascending:true});
    if (from) q = q.gte('workday', from); if (to) q = q.lte('workday', to);
    const { data, error } = await q; if (error) { setMsg('Error: ' + error.message); return; }
    setRaw((data || []) as Punch[]);
    await loadJustifs(from, to);
  };

  const loadJustifs = async (f: string, t: string) => {
    const { data } = await supabase.from('justifications')
      .select('employee_id,day,field,new_time,evidence_path,status')
      .eq('status','approved').gte('day', f).lte('day', t);
    const m = new Map<string, Justif>(); (data||[]).forEach((j:any)=>{ m.set(`${j.employee_id}-${j.day}-${j.field}`, j as Justif); });
    setJustMap(m);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  const rows: Row[] = useMemo(() => {
    const byKey = new Map<string, Row>();

    const applyOverride = (ymd: string, field: 'start_day'|'start_break'|'end_break'|'end_day', emp: string) => {
      const j = justMap.get(`${emp}-${ymd}-${field}`);
      if (!j?.new_time) return undefined;
      const d = new Date(`${ymd}T${j.new_time}:00`);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    // 1) punches
    for (const p of raw) {
      const key = `${p.employee_id}-${p.workday}`;
      if (!byKey.has(key)) {
        const wd = new Date(p.workday + 'T00:00:00').getDay();
        const sched = schedMap.get(`${p.employee_id}-${wd}`);
        const schedLite = sched ? {
          start_time: sched.start_time, break_start: sched.break_start, break_end: sched.break_end,
          end_time: sched.end_time, timezone: sched.timezone ?? TZ
        } : undefined;
        byKey.set(key, {
          employee_id: p.employee_id, email: emails.get(p.employee_id)||p.employee_id, day: p.workday,
          hours_worked: 0,
          theo_hours: theoreticalHours(schedLite),
          diff_hours: 0, sched: schedLite,
        });
      }
      const r = byKey.get(key)!;
      if (p.type === 'start_day') r.start_day = p.ts;
      else if (p.type === 'start_break') r.start_break = p.ts;
      else if (p.type === 'end_break') r.end_break = p.ts;
      else if (p.type === 'end_day') r.end_day = p.ts;
    }

    // 2) faltas
    const days = daysBetween(from, to);
    for (const empId of Array.from(employeesWithSched.values())) {
      const email = emails.get(empId) || empId;
      for (const ymd of days) {
        const key = `${empId}-${ymd}`; if (byKey.has(key)) continue;
        const wd = new Date(ymd + 'T00:00:00').getDay();
        const sched = schedMap.get(`${empId}-${wd}`);
        if (!sched || !sched.start_time || !sched.end_time) continue;
        const schedLite: Row['sched'] = {
          start_time: sched.start_time, break_start: sched.break_start, break_end: sched.break_end,
          end_time: sched.end_time, timezone: sched.timezone ?? TZ
        };
        const theo = theoreticalHours(schedLite); if (theo <= 0) continue;
        byKey.set(key, { employee_id: empId, email, day: ymd, hours_worked: 0, theo_hours: theo, diff_hours: -theo, sched: schedLite });
      }
    }

    // 3) overrides
    for (const r of byKey.values()) {
      const sd = applyOverride(r.day,'start_day',r.employee_id) ?? (r.start_day ? new Date(r.start_day) : undefined);
      const sb = applyOverride(r.day,'start_break',r.employee_id) ?? (r.start_break ? new Date(r.start_break) : undefined);
      const eb = applyOverride(r.day,'end_break',r.employee_id) ?? (r.end_break ? new Date(r.end_break) : undefined);
      const ed = applyOverride(r.day,'end_day',r.employee_id) ?? (r.end_day ? new Date(r.end_day) : undefined);

      let totalMs = 0;
      if (sd && ed && ed > sd) {
        totalMs = ed.getTime() - sd.getTime();
        if (sb && eb && eb > sb) totalMs -= (eb.getTime() - sb.getTime());
      }
      r.hours_worked = totalMs / 3600000;
      r.diff_hours = r.hours_worked - r.theo_hours;

      // refleja en UI sólo si son válidas
      if (sd && !Number.isNaN(sd.getTime())) r.start_day = sd.toISOString();
      if (sb && !Number.isNaN(sb.getTime())) r.start_break = sb.toISOString();
      if (eb && !Number.isNaN(eb.getTime())) r.end_break = eb.toISOString();
      if (ed && !Number.isNaN(ed.getTime())) r.end_day = ed.toISOString();
    }

    let list = Array.from(byKey.values()).sort((a,b)=> a.day===b.day ? a.email.localeCompare(b.email) : a.day.localeCompare(b.day));
    if (emailFilter.trim()) {
      const f = emailFilter.trim().toLowerCase(); list = list.filter(r => r.email.toLowerCase().includes(f));
    }
    return list;
  }, [raw, emails, emailFilter, schedMap, from, to, employeesWithSched, justMap]);

  const summary = useMemo(() => {
    const agg = new Map<string, { email: string; real: number; theo: number; diff: number }>();
    for (const r of rows) {
      if (!agg.has(r.email)) agg.set(r.email, { email: r.email, real: 0, theo: 0, diff: 0 });
      const a = agg.get(r.email)!; a.real += r.hours_worked; a.theo += r.theo_hours; a.diff += r.diff_hours;
    }
    return Array.from(agg.values()).sort((x,y)=>x.email.localeCompare(y.email));
  }, [rows]);

  const openJustify = (r: Row) => { setModalInfo({ employee_id: r.employee_id, email: r.email, day: r.day }); setModalOpen(true); };

  return (
    <main className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <select className="border p-2 rounded" value={period} onChange={(e)=>{ const p=e.target.value as BtnPeriod; if(p!=='personalizado') applyPeriod(p); setPeriod(p); }}>
          <option value="semana">Semana actual</option>
          <option value="mes">Mes actual</option>
          <option value="quincena">Quincena actual</option>
          <option value="personalizado">Personalizado</option>
        </select>
        <input className="border p-2 rounded" type="date" value={from} onChange={(e)=>{ setFrom(e.target.value); setPeriod('personalizado'); }} />
        <input className="border p-2 rounded" type="date" value={to} onChange={(e)=>{ setTo(e.target.value); setPeriod('personalizado'); }} />
        <input className="border p-2 rounded" placeholder="filtrar por email (opcional)" value={emailFilter} onChange={(e)=>setEmailFilter(e.target.value)} />
        <button className="border rounded px-3" onClick={load}>Aplicar filtros</button>
      </div>

      <section className="border rounded overflow-x-auto">
        <div className="p-3 font-semibold">Resumen por empleado (periodo seleccionado)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th><th className="p-2">Horas Reales</th><th className="p-2">Horas Teóricas</th><th className="p-2">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s)=>(
              <tr key={s.email} className="border-t">
                <td className="p-2">{s.email}</td>
                <td className="p-2">{s.real.toFixed(2)}</td>
                <td className="p-2">{s.theo.toFixed(2)}</td>
                <td className={`p-2 ${s.diff<0?'text-red-600':s.diff>0?'text-green-700':''}`}>{s.diff.toFixed(2)}</td>
              </tr>
            ))}
            {summary.length===0 && <tr><td className="p-2" colSpan={4}>Sin datos.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2">Email</th>
              <th className="p-2">Día</th>
              <th className="p-2">Inicio</th>
              <th className="p-2">Descanso</th>
              <th className="p-2">Fin descanso</th>
              <th className="p-2">Fin</th>
              <th className="p-2">Teórico (rango)</th>
              <th className="p-2">Horas Reales</th>
              <th className="p-2">Horas Teóricas</th>
              <th className="p-2">Diferencia</th>
              <th className="p-2">Justificantes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r)=>(
              <tr key={`${r.employee_id}-${r.day}`} className="border-t">
                <td className="p-2">{r.email}</td>
                <td className="p-2">{r.day}</td>
                <td className="p-2">{fmtTime(r.start_day)}</td>
                <td className="p-2">{fmtTime(r.start_break)}</td>
                <td className="p-2">{fmtTime(r.end_break)}</td>
                <td className="p-2">{fmtTime(r.end_day)}</td>
                <td className="p-2">{fmtTeorico(r.sched)}</td>
                <td className="p-2">{r.hours_worked.toFixed(2)}</td>
                <td className="p-2">{r.theo_hours.toFixed(2)}</td>
                <td className={`p-2 ${r.diff_hours<0?'text-red-600':r.diff_hours>0?'text-green-700':''}`}>{r.diff_hours.toFixed(2)}</td>
                <td className="p-2">
                  <button className="border rounded px-2 py-1" onClick={()=>openJustify(r)}>Justificar</button>
                </td>
              </tr>
            ))}
            {rows.length===0 && <tr><td className="p-2" colSpan={11}>Sin datos.</td></tr>}
          </tbody>
        </table>
      </section>

      {msg && <p className="text-sm">{msg}</p>}

      {modalOpen && modalInfo && (
        <JustifyModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onDone={async () => { await load(); }}
          employee_id={modalInfo.employee_id}
          email={modalInfo.email}
          day={modalInfo.day}
        />
      )}
    </main>
  );
}
