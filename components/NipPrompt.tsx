'use client';
import React, { useState } from 'react';

type NipPromptProps = {
  onSubmit: (nip: string) => Promise<void>;
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
    try {
      setBusy(true);
      await onSubmit(nip);
      setNip('');
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
