'use client';
import React, { useState } from 'react';

type NipPromptProps = {
  /** Debe devolver true si la marcación se registró; false si hubo error */
  onSubmit: (nip: string) => Promise<boolean>;
  label?: string;
  disabled?: boolean;
};

export default function NipPrompt({
  onSubmit,
  label = 'Ingresa tu NIP',
  disabled = false
}: NipPromptProps) {
  const [nip, setNip] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!nip || disabled || busy) return;
    setBusy(true);
    try {
      const ok = await onSubmit(nip);
      if (ok) setNip('');        // ← solo limpiamos si fue éxito
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <div className="space-y-2 w-full">
      <input
        className="w-full border p-2 rounded"
        type="password"
        placeholder={label}
        value={nip}
        onChange={(e) => setNip(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled || busy}
        autoComplete="off"
        inputMode="numeric"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || busy || nip.length === 0}
        className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
      >
        Confirmar
      </button>
    </div>
  );
}
