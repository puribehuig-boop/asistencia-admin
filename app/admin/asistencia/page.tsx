'use client';
};


useEffect(()=>{ void load(); }, []);


return (
<main className="space-y-3">
<div className="grid grid-cols-1 md:grid-cols-5 gap-2">
<input className="border p-2 rounded" type="date" value={from} onChange={e=>setFrom(e.target.value)} />
<input className="border p-2 rounded" type="date" value={to} onChange={e=>setTo(e.target.value)} />
<input className="border p-2 rounded" placeholder="filtrar por email (opcional)" value={email} onChange={e=>setEmail(e.target.value)} />
<button className="border rounded px-3" onClick={load}>Aplicar filtros</button>
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
<th className="p-2">Teórico</th>
</tr>
</thead>
<tbody>
{rows.map((r, i) => (
<tr key={i} className="border-t">
<td className="p-2">{r.employee_id}</td>
<td className="p-2">{r.day}</td>
<td className="p-2">{r.start_day ? new Date(r.start_day).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
<td className="p-2">{r.start_break ? new Date(r.start_break).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
<td className="p-2">{r.end_break ? new Date(r.end_break).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
<td className="p-2">{r.end_day ? new Date(r.end_day).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
<td className="p-2">{r.hours_worked?.toFixed?.(2) ?? '0.00'}</td>
<td className="p-2">{r.start_time ? `${r.start_time}–${r.end_time}` : '—'}</td>
</tr>
))}
</tbody>
</table>
</div>
</main>
);
}
