'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export default function AdminPage() {
const [me, setMe] = useState<any>(null);
const [rows, setRows] = useState<any[]>([]);
const [loading, setLoading] = useState(true);


useEffect(() => {
(async () => {
const { data: { session } } = await supabase.auth.getSession();
if (!session) { window.location.href = '/login'; return; }
const { data: mep } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
if (!mep || mep.role !== 'admin') { window.location.href = '/'; return; }
setMe(mep);
const { data } = await supabase.from('profiles').select('id, email, full_name, role, employees(id)');
setRows(data || []);
setLoading(false);
})();
}, []);


const setNip = async (empId: string) => {
const nip = prompt('Nuevo NIP (se guardará en hash)');
if (!nip) return;
const { error } = await supabase.rpc('set_employee_nip', { emp_id: empId, new_nip: nip });
if (error) alert('Error: ' + error.message); else alert('NIP actualizado');
};


if (loading) return <main className="p-6">Cargando…</main>;


return (
<main className="max-w-3xl mx-auto p-6 space-y-4">
<h1 className="text-2xl font-semibold">Admin</h1>
<div className="border rounded">
<table className="w-full text-sm">
<thead>
<tr className="bg-gray-100 text-left">
<th className="p-2">Email</th><th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Acciones</th>
</tr>
</thead>
<tbody>
{rows.map((r:any) => (
<tr key={r.id} className="border-t">
}
