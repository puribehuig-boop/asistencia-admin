'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import NipPrompt from '@/components/NipPrompt';
import { getOrCreateDeviceId } from '@/lib/device';


export default function EmpleadoPage() {
const [sessionUserId, setSessionUserId] = useState<string|null>(null);
const [msg, setMsg] = useState<string>('');
const [coords, setCoords] = useState<{lat:number|null;lng:number|null;acc:number|null}>({lat:null,lng:null,acc:null});


useEffect(() => {
(async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = '/login'; return; }
setSessionUserId(session.user.id);
if ('geolocation' in navigator) {
navigator.geolocation.getCurrentPosition(
(pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }),
() => setCoords({ lat: null, lng: null, acc: null }),
{ enableHighAccuracy: true, timeout: 8000 }
);
}
})();
}, []);


const punch = async (type: 'start_day'|'start_break'|'end_break'|'end_day', nip: string) => {
setMsg('');
const device_id = getOrCreateDeviceId();
const token = (await supabase.auth.getSession()).data.session?.access_token;
const res = await fetch('/api/punch', {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ type, nip, lat: coords.lat, lng: coords.lng, accuracy_m: coords.acc, device_id, ua: navigator.userAgent })
});
const json = await res.json();
if (!json.ok) setMsg('Error: ' + json.error);
else setMsg('¡Marcación registrada!');
};


const Button = ({ label, type }:{label:string; type:'start_day'|'start_break'|'end_break'|'end_day'}) => (
<div className="border rounded p-4 space-y-2">
<div className="font-medium">{label}</div>
<NipPrompt onSubmit={(nip) => punch(type, nip)} />
</div>
}
