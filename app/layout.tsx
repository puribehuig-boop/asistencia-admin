import './globals.css';
import type { Metadata } from 'next';


export const metadata: Metadata = {
title: 'Asistencia UIG',
description: 'MVP de asistencia',
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="es">
<body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
</html>
);
}
