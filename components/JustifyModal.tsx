'use client';
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>; // recargar datos tras guardar
  employee_id: string;
  email: string;
  day: string; // YYYY-MM-DD
  defaultField?: 'start_day' | 'start_break' | 'end_break' | 'end_day';
};

export default function JustifyModal({
  open, onClose, onDone, employee_id, email, day, defaultField = 'start_day'
}: Props) {
  const [field, setField] = useState<'start_day' | 'start_break' | 'end_break' | 'end_day'>(defaultField);
  const [time, setTime] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  if (!open) return null;

  const submit = async () => {
    setMsg('');
    if (!time) { setMsg('Ingresa la hora (HH:MM).'); return; }

    setBusy(true);
    try {
      // 1) Sube evidencia (opcional) al servidor (usa Service Role)
      let evidence_path: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('employee_id', employee_id);
        fd.append('day', day);

        const up = await fetch('/api/admin/justifications/upload', { method: 'POST', body: fd });
        const upText = await up.text();
        let upJson: any = null; try { upJson = upText ? JSON.parse(upText) : null; } catch {}
        if (!up.ok || !upJson?.ok) {
          throw new Error(upJson?.error || upText || `Error al subir archivo (${up.status})`);
        }
        evidence_path = upJson.path as string;
      }

      // 2) Crea la justificación + aplica corrección
      const { data: { session } } = await supabase.auth.getSession();
      const created_by = session?.user?.id || null;

      const res = await fetch('/api/admin/justifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id, day, field, new_time: time, reason, evidence_path, created_by, status: 'approved'
        })
      });
      const raw = await res.text();
      let json: any = null; try { json = raw ? JSON.parse(raw) : null; } catch {}
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || raw || `Error HTTP ${res.status}`);
      }

      await onDone(); // recarga listas
      onClose();
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-5 space-y-4">
        <div className="text-lg font-semibold">Justificar incidencia</div>
        <div className="text-sm text-gray-600">
          <div><span className="font-medium">Empleado:</span> {email}</div>
          <div><span className="font-medium">Día:</span> {day}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Campo a corregir</label>
            <select className="w-full border p-2 rounded" value={field} onChange={e => setField(e.target.value as any)}>
              <option value="start_day">Inicio de jornada</option>
              <option value="start_break">Inicio de descanso</option>
              <option value="end_break">Fin de descanso</option>
              <option value="end_day">Fin de jornada</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Nueva hora (HH:MM)</label>
            <input type="time" className="w-full border p-2 rounded" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm">Motivo / notas</label>
          <textarea className="w-full border p-2 rounded" rows={3} placeholder="Describe la justificación"
            value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Evidencia (opcional)</label>
          <input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
          {file && <div className="text-xs text-gray-600 mt-1">Archivo: {file.name}</div>}
        </div>

        {msg && <p className="text-sm text-red-600">{msg}</p>}

        <div className="flex justify-end gap-2">
          <button className="border rounded px-3 py-2" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="bg-black text-white rounded px-3 py-2 disabled:opacity-50" onClick={submit} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar y aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
