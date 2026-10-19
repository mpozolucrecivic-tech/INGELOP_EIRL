import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { Bell, CheckCheck } from 'lucide-react';
import { useContadorNotificaciones, useLeerNotificacion, useLeerTodas, useNotificaciones, type Notificacion } from '@/api/notificaciones';
import { Spinner } from '@/components/ui/Display';

/** "hace 5 min", "hace 3 h", "hace 2 días" */
function haceCuanto(fecha: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 60_000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

// Color del punto según el tipo de aviso
const tono = (tipo: string) =>
  /OBSERVAD|VENCIDO/.test(tipo) ? 'bg-red-500' : /APROBAD/.test(tipo) ? 'bg-emerald-500' : /POR_VENCER/.test(tipo) ? 'bg-amber-500' : 'bg-sky-500';

export function Campana() {
  const [abierta, setAbierta] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: noLeidas = 0 } = useContadorNotificaciones();
  const { data, isLoading } = useNotificaciones(abierta);
  const leer = useLeerNotificacion();
  const leerTodas = useLeerTodas();

  // Cierra al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setAbierta(false);
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setAbierta(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
    };
  }, [abierta]);

  const abrir = (n: Notificacion) => {
    if (!n.leidaEn) leer.mutate(n.id);
    setAbierta(false);
    if (n.enlace) navigate(n.enlace);
  };

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setAbierta((a) => !a)}
        className="relative rounded-md p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        aria-label={noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierta}
      >
        <Bell className="size-5" />
        {noLeidas > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierta && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
            {noLeidas > 0 && (
              <button
                onClick={() => leerTodas.mutate()}
                disabled={leerTodas.isPending}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" />
                Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {isLoading ? (
              <Spinner />
            ) : !data?.notificaciones.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No tienes notificaciones.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.notificaciones.map((n) => (
                  <li key={n.id}>
                    <button onClick={() => abrir(n)} className={clsx('flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50', !n.leidaEn && 'bg-brand-50/40')}>
                      <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', n.leidaEn ? 'bg-slate-200' : tono(n.tipo))} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block text-sm', n.leidaEn ? 'text-slate-600' : 'font-semibold text-slate-900')}>{n.titulo}</span>
                        {n.mensaje && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.mensaje}</span>}
                        <span className="mt-1 block text-[11px] text-slate-400">{haceCuanto(n.creadoEn)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
