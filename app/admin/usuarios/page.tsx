'use client';
const resetNip = async (id: string) => {
setMsg('');
if (!nip) { setMsg('Ingresa un NIP primero.'); return; }
const res = await fetch('/api/admin/users/reset-nip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: id, nip }) });
const json = await res.json(); if (!json.ok) setMsg('Error: ' + json.error); else { setMsg('NIP actualizado.'); setNip(''); }
};


return (
<main className="space-y-6">
<section className="border rounded p-4 space-y-2">
<h2 className="font-semibold">Invitar usuario</h2>
<div className="grid grid-cols-1 md:grid-cols-5 gap-2">
<input className="border p-2 rounded" placeholder="correo" value={email} onChange={e=>setEmail(e.target.value)} />
<input className="border p-2 rounded" placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} />
<select className="border p-2 rounded" value={role} onChange={e=>setRole(e.target.value as any)}>
<option value="employee">Empleado</option>
<option value="admin">Admin</option>
<option value="nomina">Nómina</option>
</select>
<button className="bg-black text-white rounded p-2" onClick={invite}>Invitar</button>
</div>
</section>


<section className="border rounded p-4 overflow-x-auto">
<table className="w-full text-sm">
<thead>
<tr className="bg-gray-100 text-left">
<th className="p-2">Email</th><th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Estado</th><th className="p-2">Acciones</th>
</tr>
</thead>
<tbody>
{rows.map(r => (
<tr key={r.id} className="border-t">
<td className="p-2">{r.email}</td>
<td className="p-2">{r.full_name || '-'}</td>
<td className="p-2">
<select className="border p-1 rounded" value={r.role} onChange={e=>setRoleFn(r.id, e.target.value as any)}>
<option value="employee">Empleado</option>
<option value="admin">Admin</option>
<option value="nomina">Nómina</option>
</select>
</td>
<td className="p-2">
<button className="border rounded px-2 py-1" onClick={()=>setStatus(r.id, r.status==='active'?'inactive':'active')}>
{r.status === 'active' ? 'Pausar' : 'Activar'}
</button>
</td>
<td className="p-2 space-x-2">
<button className="border rounded px-2 py-1" onClick={()=>resetPwd(r.email)}>Reset password</button>
<input className="border p-1 rounded w-24" placeholder="Nuevo NIP" value={nip} onChange={e=>setNip(e.target.value)} />
<button className="border rounded px-2 py-1" onClick={()=>resetNip(r.id)}>Set NIP</button>
</td>
</tr>
))}
</tbody>
</table>
</section>
{msg && <p className="text-sm">{msg}</p>}
</main>
);
}
