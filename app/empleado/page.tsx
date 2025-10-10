'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NipPrompt from '@/components/NipPrompt';
import { getOrCreateDeviceId } from '@/lib/device';


type BtnType = 'start_day' | 'start_break' | 'end_break' | 'end_day';
const TZ = 'America/Mexico_City';


function fmtDate(d: Date) {
return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ });
}
function fmtClock(d: Date) {
return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ });
}
function fmtTimeIso(iso: string) {
const d = new Date(iso);
return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
}


export default function EmpleadoPage() {
const [userId, setUserId] = useState<string | null>(null);
const [fullName, setFullName] = useState<string>('');
const [msg, setMsg] = useState<string>('');
const [now, setNow] = useState<Date>(new Date());
const [todayTypes, setTodayTypes] = useState<BtnType[]>([]);
const [times, setTimes] = useState<Partial<Record<BtnType, string>>>({});
const [coords, setCoords] = useState<{ lat: number | null; lng: number | null; acc: number | null }>({ lat: null, lng: null, acc: null });


useEffect(() => {
const id = setInterval(() => setNow(new Date()), 1000);
return () => clearInterval(id);
}, []);

useEffect(() => {
type,
nip,
lat: coords.lat,
lng: coords.lng,
accuracy_m: coords.acc,
device_id,
ua: navigator.userAgent
})
});
const json = await res.json();
if (!json.ok) { setMsg('Error: ' + json.error); return; }


// Éxito → bloquear botón y guardar hora del servidor
const serverTs: string = json.punch.ts;
setTodayTypes(prev => prev.includes(type) ? prev : [...prev, type]);
setTimes(prev => ({ ...prev, [type]: fmtTimeIso(serverTs) }));
setMsg('¡Marcación registrada!');
};


const Row = ({ label, type }: { label: string; type: BtnType }) => (
<div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 border rounded p-3">
<div className="font-medium">{label}</div>
<div>
<NipPrompt disabled={disabled(type)} onSubmit={(nip) => punch(type, nip)} />
</div>
<div className="text-sm text-gray-600 md:text-right">
{times[type] ? `Marcado a las ${times[type]}` : '—'}
</div>
</div>
);


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
<Row label="Inicio de jornada" type="start_day" />
<Row label="Inicio de descanso" type="start_break" />
<Row label="Fin de descanso" type="end_break" />
<Row label="Fin de jornada" type="end_day" />
</section>


{msg && <p className="text-sm text-gray-700">{msg}</p>}
</main>
);
}
