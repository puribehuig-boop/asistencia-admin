'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UploadRow = {
  email: string;
  weekday: number; // 0..6 (Dom..Sáb)
  start_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  end_time?: string | null;
  timezone?: string | null;
};

type SchedRow = {
  employee_id: string;
  email: string;
  weekday: number;
  start_time: string | null;
  break_start: string | null;
  break_end: string | null;
  end_time: string | null;
  timezone: string | null;
};

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Parser CSV simple (soporta comillas dobles básicas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field.trim()); field = ''; }
      else if (c === '\n') { row.push(field.trim()); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows.filter(r => r.length > 0 && r.some(x => x !== ''));
}

export default function AdminHorarios() {
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0); // para resetear <input type="file" />
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [msgKind, setMsgKind] = useState<'success' | 'error' | ''>('');
  const [search, setSearch] = useState('');
  const [schedules, setSchedules] = useState<SchedRow[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setMsg(''); setMsgKind('');
    setFile(e.target.files?.[0] ?? null);
  };

  const downloadTemplate = () => {
    const header = 'email,weekday,start_time,break_start,break_end,end_time,timezone\n';
    const sample = 'empleado@ejemplo.com,1,09:00,14:00,15:00,18:00,America/Mexico_City\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'horarios_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    setMsg(''); setMsgKind('');
    if (!file) { setMsg('Selecciona un archivo CSV.'); setMsgKind('error'); return; }

    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { setMsg('CSV vacío o sin filas de datos.'); setMsgKind('error'); return; }

      const header = rows[0].map(h => h.toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      const iEmail = idx('email');
      const iW = idx('weekday');
      const iS = idx('start_time');
      const iBS = idx('break_start');
      const iBE = idx('break_end');
      const iE = idx('end_time');
      const iTZ = idx('timezone');

      if (iEmail < 0 || iW < 0) {
        setMsg('El CSV debe incluir al menos las columnas: email, weekday.');
        setMsgKind('error'); return;
      }

      const payload: UploadRow[] = rows.slice(1).map(cols => ({
        email: cols[iEmail] || '',
        weekday: Number(cols[iW] ?? '0'),
        start_time: (iS >= 0 ? cols[iS] : '') || null,
        break_start: (iBS >= 0 ? cols[iBS] : '') || null,
        break_end: (iBE >= 0 ? cols[iBE] : '') || null,
        end_time: (iE >= 0 ? cols[iE] : '') || null,
        timezone: (iTZ >= 0 ? cols[iTZ] : '') || 'America/Mexico_City',
      })).filter(r =>
        r.email && Number.isFinite(r.weekday) && r.weekday >= 0 && r.weekday <= 6
      );

      if (payload.length === 0) { setMsg('No hay filas válidas para importar.'); setMsgKind('error'); return; }

      const res = await fetch('/api/admin/schedules/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Robustez: intenta parsear JSON, pero maneja respuesta vacía/no-JSON
      const rawText = await res.text();
      let json: any = null;
      try { json = rawText ? JSON.parse(rawText) : null; } catch { /* no JSON */ }

      if (!res.ok || !json || json.ok === false) {
        const errMsg = (json && json.error) ? json.error
          : rawText?.slice(0, 200) || `Error HTTP ${res.status}`;
        setMsg('Error al importar: ' + errMsg);
        setMsgKind('error');
        return;
      }

      setMsg(`Importación exitosa: ${json.count} filas.`);
      setMsgKind('success');
      setFile(null); setFileKey(k => k + 1);
      await loadSchedules(); // recargar tabla
    } catch (e: any) {
      setMsg('Error al leer CSV: ' + (e?.message || String(e)));
      setMsgKind('error');
    } finally {
      setUploading(false);
    }
  };

  const loadSchedules = async () => {
    setLoadingTable(true);
    setMsg(''); setMsgKind('');
    try {
      const { data: profs, error: e1 } = await supabase.from('profiles').select('id,email');
      if (e1) throw new Error(e1.message);
      const mapEmail = new Map<string, string>((profs || []).map((p: any) => [p.id, p.email]));

      const { data: ws, error: e2 } = await supabase
        .from('work_schedules')
        .select('employee_id,weekday,start_time,break_start,break_end,end_time,timezone')
        .order('employee_id')
        .order('weekday');
      if (e2) throw new Error(e2.message);

      const list: SchedRow[] = (ws || []).map((s: any) => ({
        employee_id: s.employee_id,
        email: mapEmail.get(s.employee_id) || s.employee_id,
        weekday: s.weekday,
        start_time: s.start_time,
        break_start: s.break_start,
        break_end: s.break_end,
        end_time: s.end_time,
        timezone: s.timezone || 'America/Mexico_City',
      }));

      setSchedules(list);
    } catch (e: any) {
      setMsg('Error cargando horarios: ' + (e?.message || String(e)));
      setMsgKind('error');
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => { void loadSchedules(); }, []);

  const filtered = useMemo(() => {
    const f = search.trim().toLowerCase();
    if (!f) return schedules;
    return schedules.filter(r => r.email.toLowerCase().includes(f));
  }, [schedules, search]);

  return (
    <main className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <button className="border rounded px-3 py-2" onClick={downloadTemplate}>
          Descargar plantilla CSV
        </button>

        <input
          key={fileKey}
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="border rounded p-2"
        />

        <button
          className="border rounded px-3 py-2 disabled:opacity-50"
          onClick={importCsv}
          disabled={!file || uploading}
        >
          {uploading ? 'Importando…' : 'Importar CSV'}
        </button>

        {file && !uploading && (
          <span className="text-sm text-gray-600">Archivo seleccionado: {file.name}</span>
        )}
      </div>

      {msg && (
        <p className={`text-sm ${msgKind === 'success' ? 'text-green-700' : msgKind === 'error' ? 'text-red-600' : ''}`}>
          {msg}
        </p>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Horarios existentes</h2>
          <input
            className="border p-2 rounded"
            placeholder="Buscar por email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                <th className="p-2">Zona horaria</th>
              </tr>
            </thead>
            <tbody>
              {loadingTable && (
                <tr><td className="p-2" colSpan={7}>Cargando…</td></tr>
              )}
              {!loadingTable && filtered.map((r, i) => (
                <tr key={`${r.employee_id}-${r.weekday}-${i}`} className="border-t">
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{weekdays[r.weekday] ?? r.weekday}</td>
                  <td className="p-2">{r.start_time ?? '—'}</td>
                  <td className="p-2">{r.break_start ?? '—'}</td>
                  <td className="p-2">{r.break_end ?? '—'}</td>
                  <td className="p-2">{r.end_time ?? '—'}</td>
                  <td className="p-2">{r.timezone ?? 'America/Mexico_City'}</td>
                </tr>
              ))}
              {!loadingTable && filtered.length === 0 && (
                <tr><td className="p-2" colSpan={7}>Sin horarios.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
