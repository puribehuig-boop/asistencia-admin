export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-7xl mx-auto px-3 md:px-4 lg:px-5 py-4">
      <nav className="flex gap-4 mb-4 border-b pb-2">
        <a href="/admin/usuarios" className="underline">Usuarios</a>
        <a href="/admin/horarios" className="underline">Horarios</a>
        <a href="/admin/asistencia" className="underline">Asistencia</a>
      </nav>
      {children}
    </div>
  );
}
