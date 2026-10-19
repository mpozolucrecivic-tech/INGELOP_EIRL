import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/** Marco de las pantallas públicas de acceso (recuperar y restablecer contraseña) */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.svg?v=2" alt="" className="size-10" />
          <div>
            <p className="font-bold tracking-wide text-slate-900">INGELOP</p>
            <p className="text-xs text-slate-500">Intranet</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export function Aviso({ tono, children }: { tono: 'exito' | 'error' | 'info'; children: ReactNode }) {
  const estilos = {
    exito: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tono];
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-sm ${estilos}`} role={tono === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
