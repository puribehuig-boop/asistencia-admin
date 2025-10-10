'use client';
const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a'); a.href=url; a.download='horarios_template.csv'; a.click(); URL.revokeObjectURL(url);
};


const importCsv = async () => {
setMsg('');
if (!csv.trim()) { setMsg('Pega el CSV primero.'); return; }
const lines = csv.trim().split(/
?
/);
const [h, ...rows] = lines;
const idx = (key:string) => h.split(',').map(s=>s.trim()).indexOf(key);
const iEmail = idx('email'); const iW = idx('weekday');
const iS = idx('start_time'); const iBS = idx('break_start'); const iBE = idx('break_end'); const iE = idx('end_time');
const iTZ = idx('timezone');
const payload: Row[] = rows.map(line => {
const cols = line.split(',');
return {
email: cols[iEmail]?.trim(),
weekday: Number(cols[iW]?.trim()||'0'),
start_time: cols[iS]?.trim()||null,
break_start: cols[iBS]?.trim()||null,
break_end: cols[iBE]?.trim()||null,
end_time: cols[iE]?.trim()||null,
timezone: (cols[iTZ]?.trim()||'') || 'America/Mexico_City'
};
});


const res = await fetch('/api/admin/schedules/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
const json = await res.json();
setMsg(json.ok ? `Importadas ${json.count} filas.` : 'Error: ' + json.error);
};


return (
<main className="space-y-4">
<div className="flex gap-2">
<button className="border rounded px-3 py-2" onClick={downloadTemplate}>Descargar plantilla CSV</button>
<button className="border rounded px-3 py-2" onClick={importCsv}>Importar CSV</button>
</div>
<textarea className="w-full h-64 border p-2 rounded font-mono" placeholder="Pega aquí el CSV de horarios" value={csv} onChange={e=>setCsv(e.target.value)} />
{msg && <p className="text-sm">{msg}</p>}
</main>
);
}
