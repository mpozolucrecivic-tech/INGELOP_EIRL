import { Link } from 'react-router';
import clsx from 'clsx';
import { formatFecha } from '@/lib/format';

export interface FilaCronograma {
  id: string;
  etiqueta: string;
  detalle?: string;
  /** Fechas ISO (medianoche UTC). Sin fin = hito (un punto en la fecha de inicio) */
  inicio: string;
  fin?: string | null;
  /** Clase de color de Tailwind para la barra o el hito, ej. "bg-brand-500" */
  color: string;
  /** Texto del recuadro al pasar el mouse */
  titulo?: string;
  enlace?: string;
  /** Primera fila de un grupo: se dibuja un encabezado antes */
  grupo?: string;
}

const DIA = 86_400_000;
const mesCorto = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/**
 * Diagrama de Gantt simple: una fila por elemento, barras entre dos fechas, hitos como rombos y una línea en el día de hoy.
 * Las posiciones son porcentajes del rango total, así que se adapta al ancho (con desplazamiento horizontal en móvil).
 */
export function Cronograma({ filas, vacio = 'Sin fechas para mostrar.' }: { filas: FilaCronograma[]; vacio?: string }) {
  const conFecha = filas.filter((f) => f.inicio);
  if (!conFecha.length) return <p className="px-5 py-10 text-center text-sm text-slate-500">{vacio}</p>;

  const t = (iso: string) => new Date(iso).getTime();
  const hoy = Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const fechas = conFecha.flatMap((f) => [t(f.inicio), f.fin ? t(f.fin) : t(f.inicio)]);
  // Rango: del primer al último día, con margen, empezando el día 1 del mes
  const minimo = new Date(Math.min(...fechas, hoy) - 7 * DIA);
  const desde = Date.UTC(minimo.getUTCFullYear(), minimo.getUTCMonth(), 1);
  const hasta = Math.max(...fechas, hoy) + 10 * DIA;
  const total = hasta - desde;
  const pos = (ms: number) => `${((ms - desde) / total) * 100}%`;

  const meses: number[] = [];
  for (let d = new Date(desde); d.getTime() <= hasta; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) meses.push(d.getTime());
  // Con muchos meses, rotular uno de cada N para que no se encimen
  const paso = Math.ceil(meses.length / 12);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        {/* Regla de meses */}
        <div className="grid grid-cols-[14rem_1fr] border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
          <div className="px-4 py-2 font-semibold uppercase tracking-wide">Elemento</div>
          <div className="relative h-8">
            {meses.map((m, i) => (
              <span key={m} className="absolute top-2 whitespace-nowrap border-l border-slate-200 pl-1" style={{ left: pos(m) }}>
                {i % paso === 0 ? mesCorto.format(new Date(m)) : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          {/* Línea de hoy sobre toda la columna de tiempo */}
          <div className="pointer-events-none absolute inset-y-0 left-56 right-0">
            <div className="absolute inset-y-0 w-px bg-red-400" style={{ left: pos(hoy) }} title="Hoy" />
          </div>

          {conFecha.map((f) => {
            const inicio = t(f.inicio);
            const fin = f.fin ? Math.max(t(f.fin), inicio) : null;
            const titulo = f.titulo ?? (fin ? `${formatFecha(f.inicio)} → ${formatFecha(f.fin!)}` : formatFecha(f.inicio));
            const etiqueta = (
              <>
                <span className="block truncate text-sm text-slate-800">{f.etiqueta}</span>
                {f.detalle && <span className="block truncate text-xs text-slate-500">{f.detalle}</span>}
              </>
            );
            return (
              <div key={f.id}>
                {f.grupo && <div className="border-b border-slate-100 bg-white px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">{f.grupo}</div>}
                <div className="grid grid-cols-[14rem_1fr] border-b border-slate-100 hover:bg-slate-50">
                  <div className="min-w-0 px-4 py-2">
                    {f.enlace ? (
                      <Link to={f.enlace} className="block hover:underline">
                        {etiqueta}
                      </Link>
                    ) : (
                      etiqueta
                    )}
                  </div>
                  <div className="relative h-11">
                    {meses.map((m) => (
                      <div key={m} className="absolute inset-y-0 w-px bg-slate-100" style={{ left: pos(m) }} />
                    ))}
                    {fin ? (
                      <div
                        className={clsx('absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full', f.color)}
                        style={{ left: pos(inicio), width: `max(4px, ${((fin + DIA - inicio) / total) * 100}%)` }}
                        title={titulo}
                      />
                    ) : (
                      <div className={clsx('absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px]', f.color)} style={{ left: pos(inicio) }} title={titulo} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LeyendaCronograma({ items }: { items: { color: string; texto: string; hito?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-5 py-3 text-xs text-slate-600">
      {items.map((i) => (
        <span key={i.texto} className="inline-flex items-center gap-1.5">
          <span className={clsx(i.hito ? 'size-2.5 rotate-45 rounded-[2px]' : 'h-2.5 w-5 rounded-full', i.color)} />
          {i.texto}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-3 w-px bg-red-400" />
        Hoy
      </span>
    </div>
  );
}
