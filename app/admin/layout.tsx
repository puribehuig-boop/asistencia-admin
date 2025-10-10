export default function AdminLayout({ children }: { children: React.ReactNode }) {
return (
<div className="max-w-5xl mx-auto p-6">
<nav className="flex gap-4 mb-6 border-b pb-2">
<a href="/admin/usuarios" className="underline">Usuarios</a>
<a href="/admin/horarios" className="underline">Horarios</a>
<a href="/admin/asistencia" className="underline">Asistencia</a>
</nav>
{children}
</div>
);
}
