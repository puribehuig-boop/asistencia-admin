'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NipPrompt from '@/components/NipPrompt';
import { getOrCreateDeviceId } from '@/lib/device';

type BtnType = 'start_day' | 'start_break' | 'end_break' | 'end_day';
const TZ = 'America/Mexico_City';

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ,
  });
}
function fmtClock(d: Date) {
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ,
  });
}
function fmtTimeIso(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}

/** Fila estable: NO se redefine en cada render */
const PunchRow = React.memo(function PunchRow(props: {
  label: string;
  type: BtnType;
  disabled: boolean;
  time?: string;
  onSubmit: (nip: string) => Promise<boolean>;
}) {
  const { label, type, disabled, time, onSubmit } = props;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border rounded p-3">
      <div className="font-medium">{label}</div>
      <div>
        <NipPrompt disabled={disabled} onSubmit={onSubmit} />
      </div>
      <div className="text-sm text-gray-600 md:text-right">
        {time ? `Marcado a las ${time}` : '—'}
      </div>
    </div>
  );
});

export default function EmpleadoPage() {
  const [fullName, setFullName] = useState<string>('Empleado');
  const [msg, setMsg] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());
  const [todayTypes, setTodayTypes] = useState<BtnType[]>([]);
  const [times, setTimes] = useState<Partial<Record<BtnType, string>>>({});
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; acc: number | null }>({
    lat: null, lng: null, acc: null,
  });

  // Reloj (esto re-renderiza la página, pero ya NO desmonta las filas)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      const { data: prof } = await supabase
        .from('profiles').select('full_name').eq('id', session.user.id).maybeSingle();
      if (prof?.full_name) setFullName(prof.full_name);

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
          () => setCoords({ lat: null, lng: null, acc: null }),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }

      await loadToday();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadToday = useCallback(async () => {
    const todayLocal = new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
    const { data } = await supabase
      .from('punches')
      .select('type, ts, workday')
      .eq('workday', todayLocal);

    const list = (data || []) as Array<{ type: BtnType; ts: string }>;
    setTodayTypes(list.map(r => r.type));
    const tmap: Partial<Record<BtnType, string>> = {};
    list.forEach(r => { tmap[r.type] = fmtTimeIso(r.ts); });
    setTimes(tmap);
  }, []);

  const isDisabled = useCallback((t: BtnType) => {
    const has = (x: BtnType) => todayTypes.includes(x);
    if (t === 'start_day')   return has('start_day');
    if (t === 'start_break') return !has('start_day') || has('start_break') || has('end_day');
    if (t === 'end_break')   return !has('start_day') || !has('start_break') || has('end_break') || has('end_day');
    if (t === 'end_day')     return !has('start_day') || has('end_day');
    return false;
  }, [todayTypes]);

  const punch = useCallback(async (type: BtnType, nip: string): Promise<boolean> => {
    setMsg('');
    const device_id = getOrCreateDeviceId();
    const token = (await supabase.auth.getSession()).data.session?.access_token;

    const res = await fetch('/api/punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({
        type,
        nip,
        lat: coords.lat,
        lng: coords.lng,
        accuracy_m: coords.acc,
        device_id,
        ua: navigator.userAgent,
      }),
    });

    const json = await res.json();
    if (!json.ok) { setMsg('Error: ' + json.error); return false; }

    // Actualizamos hora y estado desde servidor
    const serverTs: string = json.punch.ts;
    setTimes(prev => ({ ...prev, [type]: fmtTimeIso(serverTs) }));
    await loadToday();
    setMsg('¡Marcación registrada!');
    return true;
  }, [coords.lat, coords.lng, coords.acc, loadToday]);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-5">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
        <div>
          <div className="text-xl font-semibold">{fullName}</div>
          <div className="text-sm text-gray-600">{fmtDate(now)}</div>
        </div>
        <div className="text-2xl tabular-nums">{fmtClock(now)}</div>
      </header>

      <section className="grid grid-cols-1 gap-3">
        <PunchRow
          label="Inicio de jornada"
          type="start_day"
          disabled={isDisabled('start_day')}
          time={times['start_day']}
          onSubmit={(nip) => punch('start_day', nip)}
        />
        <PunchRow
          label="Inicio de descanso"
          type="start_break"
          disabled={isDisabled('start_break')}
          time={times['start_break']}
          onSubmit={(nip) => punch('start_break', nip)}
        />
        <PunchRow
          label="Fin de descanso"
          type="end_break"
          disabled={isDisabled('end_break')}
          time={times['end_break']}
          onSubmit={(nip) => punch('end_break', nip)}
        />
        <PunchRow
          label="Fin de jornada"
          type="end_day"
          disabled={isDisabled('end_day')}
          time={times['end_day']}
          onSubmit={(nip) => punch('end_day', nip)}
        />
      </section>

      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
