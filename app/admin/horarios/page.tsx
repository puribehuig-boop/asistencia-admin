'use client';
import React, { useState } from 'react';

type Row = {
  email: string;
  weekday: number; // 0..6 (Dom..Sáb)
  start_time?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  end_time?: string | null;
  timezone?: string | null;
};

export default function AdminHorarios() {
  const [csv, setCsv] = useState('');
  const [msg, setMsg] = useState('');

  const downloadTemplate = () => {
    const header = 'email,weekday,start_time,break_start,break_end,end_time,timezone\n';
    const sample = 'empleado@ejemplo.com,1,09:00,14:00,15:00,18:00,America/Mexico_City\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horarios_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    setMsg('');
    const text = csv.trim();
    if (!text) { setMsg('Pega el CSV primero.'); return; }

    const lines = text.split(/\r?\n/);
    if (lines.length < 2) { setMsg('CSV vacío.'); return; }

    const header = lines[0].split(',').map(s => s.trim());
    const idx = (k: string) => header.indexOf(k);
    const iEmail = idx('email');
    const iW = idx('weekday');
    const iS = idx('start_time');
    const iBS = idx('break_start');
    const iBE = idx('break_end');
    const iE = idx('end_time');
    const iTZ = idx('timezone');

    const rows: Row[] = lines.slice(1).map(line => {
      const cols = line.split(',').map(s => s.trim());
      return {
        email: cols[iEmail] || '',
        weekday: Number(cols[iW] ?? '0'),
        start_time: cols[iS] || null,
        break_start: cols[iBS] || null,
        break_end: cols[iBE] || null,
        end_time: cols[iE] || null,
        timezone: cols[iTZ] || 'America/Mexico_City',
      };
    }).filter(r =>
      r.email &&
      Number.isFinite(r.weekday) &&
      r.weekday >= 0 && r.weekday <= 6
    );

    if (rows.length === 0) { setMsg('No hay filas válidas.'); return; }

    const res = await fetch('/api/admin/schedules/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    const json = await res.json();
    setMsg(json.ok ? `Importadas ${json.count} filas.` : `Error: ${json.error}`);
  };

  return (
    <main className="space-y-4">
      <div className="flex gap-2">
        <button className="border rounded px-3 py-2" onClick={downloadTemplate}>
          Descargar plantilla CSV
        </button>
        <button className="border rounded px-3 py-2" onClick={importCsv}>
          Importar CSV
        </button>
      </div>

      <textarea
        className="w-full h-64 border p-2 rounded font-mono"
        placeholder="Pega aquí el CSV de horarios"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />

      {msg && <p className="text-sm">{msg}</p>}
    </main>
  );
}
