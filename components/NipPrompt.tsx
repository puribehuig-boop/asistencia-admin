'use client';
import { useState } from 'react';


type Props = {
onSubmit: (nip: string) => Promise<void>;
label?: string;
disabled?: boolean;
};


export default function NipPrompt({ onSubmit, label = 'Ingresa tu NIP', disabled = false }: Props) {
const [nip, setNip] = useState('');
const [busy, setBusy] = useState(false);
const submit = async () => {
setBusy(true);
await onSubmit(nip);
setBusy(false);
setNip('');
};
return (
<div className="space-y-2 w-full">
<input
className="w-full border p-2 rounded"
type="password"
placeholder={label}
value={nip}
onChange={e=>setNip(e.target.value)}
disabled={disabled}
/>
<button
disabled={disabled || !nip || busy}
onClick={submit}
className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50"
>
Confirmar
</button>
</div>
);
}
```tsx
'use client';
import { useState } from 'react';


type Props = { onSubmit: (nip: string) => Promise<void>; label?: string };


export default function NipPrompt({ onSubmit, label = 'Ingresa tu NIP' }: Props) {
const [nip, setNip] = useState('');
const [busy, setBusy] = useState(false);
const submit = async () => {
setBusy(true);
await onSubmit(nip);
setBusy(false);
setNip('');
};
return (
<div className="space-y-2">
<input className="w-full border p-2 rounded" type="password" placeholder={label} value={nip} onChange={e=>setNip(e.target.value)} />
<button disabled={!nip || busy} onClick={submit} className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50">Confirmar</button>
</div>
);
}
