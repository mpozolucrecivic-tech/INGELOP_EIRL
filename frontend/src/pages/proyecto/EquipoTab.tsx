import { useEffect, useMemo, useState } from 'react';
import { Clock, Plus, Trash2, UserMinus, Users } from 'lucide-react';
import { useTrabajadores } from '@/api/admin';
import {
  useAsignaciones,
  useCerrarAsignacion,
  useCrearAsignacion,
  useEliminarRegistroHoras,
  useRegistrarHoras,
  useRegistrosHoras,
  useResumenHoras,
} from '@/api/recursos';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { aInputFecha, formatFecha, formatNumero, formatSoles, hoyInput } from '@/lib/format';
import type { Asignacion } from '@/types/api';

/** ¿La asignación cubre la fecha (YYYY-MM-DD)? */
const cubre = (a: Asignacion, fecha: string) => aInputFecha(a.fechaInicio) <= fecha && (!a.fechaFin || aInputFecha(a.fechaFin) >= fecha);
const inicioDeMes = () => `${hoyInput().slice(0, 7)}-01`;

export default function EquipoTab({ proyectoId }: { proyectoId: number }) {
  const { data: asignaciones, isLoading, error, refetch } = useAsignaciones(proyectoId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <RegistroHorasCard proyectoId={proyectoId} asignaciones={asignaciones ?? []} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ResumenHorasCard proyectoId={proyectoId} />
        <Asignaciones proyectoId={proyectoId} asignaciones={asignaciones ?? []} />
      </div>
    </div>
  );
}

// ---------------- Registro de horas ----------------

function RegistroHorasCard({ proyectoId, asignaciones }: { proyectoId: number; asignaciones: Asignacion[] }) {
  const [fecha, setFecha] = useState(hoyInput());
  const [trabajadorId, setTrabajadorId] = useState('');
  const [horas, setHoras] = useState('8');
  const [descripcion, setDescripcion] = useState('');
  const registrar = useRegistrarHoras(proyectoId);
  const eliminar = useEliminarRegistroHoras(proyectoId);
  const [desde, setDesde] = useState(inicioDeMes());
  const { data: registros = [], isLoading } = useRegistrosHoras(proyectoId, { desde, hasta: hoyInput() });

  const disponibles = useMemo(() => asignaciones.filter((a) => cubre(a, fecha)), [asignaciones, fecha]);
  useEffect(() => {
    if (trabajadorId && !disponibles.some((a) => String(a.trabajadorId) === trabajadorId)) setTrabajadorId('');
  }, [disponibles, trabajadorId]);

  const valido = trabajadorId && Number(horas) > 0 && Number(horas) <= 24;

  const guardar = async () => {
    await registrar.mutateAsync({ trabajadorId: Number(trabajadorId), fecha, horas: Number(horas), descripcion: descripcion.trim() || undefined });
    setDescripcion('');
  };

  return (
    <Card>
      <CardHeader title="Registro de horas" subtitle="Horas dedicadas por cada profesional al proyecto, con la tarea realizada." />
      <div className="grid grid-cols-1 items-end gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-[160px_1fr_110px_2fr_auto]">
        <Input label="Fecha" type="date" value={fecha} max={hoyInput()} onChange={(e) => setFecha(e.target.value)} />
        <Select label="Profesional" value={trabajadorId} onChange={(e) => setTrabajadorId(e.target.value)} hint={disponibles.length ? undefined : 'Nadie asignado en esa fecha'}>
          <option value="">Selecciona…</option>
          {disponibles.map((a) => (
            <option key={a.id} value={a.trabajadorId}>
              {a.trabajador.nombre} — {a.trabajador.cargo}
            </option>
          ))}
        </Select>
        <Input label="Horas" type="number" min={0.5} max={24} step={0.5} value={horas} onChange={(e) => setHoras(e.target.value)} />
        <Input
          label="Tarea realizada"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Modelado estructural bloque B"
          onKeyDown={(e) => e.key === 'Enter' && valido && guardar()}
        />
        <Button icon={<Plus className="size-4" />} onClick={guardar} loading={registrar.isPending} disabled={!valido}>
          Registrar
        </Button>
      </div>

      <div className="flex items-center justify-between px-5 pt-3 text-sm">
        <span className="font-medium text-slate-700">Registros recientes</span>
        <label className="flex items-center gap-2 text-slate-500">
          desde
          <input type="date" value={desde} max={hoyInput()} onChange={(e) => setDesde(e.target.value)} className="h-8 rounded-lg border border-slate-300 px-2 text-sm" />
        </label>
      </div>
      {isLoading ? (
        <Spinner />
      ) : !registros.length ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Sin horas registradas en el periodo.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Fecha</th>
              <th className={th}>Profesional</th>
              <th className={th}>Tarea</th>
              <th className={`${th} text-right`}>Horas</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody>
            {registros.slice(0, 60).map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(r.fecha)}</td>
                <td className={td}>
                  <p className="font-medium text-slate-900">{r.trabajador.nombre}</p>
                  <p className="text-xs text-slate-500">{r.trabajador.cargo}</p>
                </td>
                <td className={`${td} text-slate-600`}>{r.descripcion ?? '—'}</td>
                <td className={`${td} text-right font-medium tabular-nums`}>{formatNumero(r.horas)} h</td>
                <td className={td}>
                  <IconButton label="Eliminar registro" className="hover:text-red-600" onClick={() => eliminar.mutate(r.id)}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

// ---------------- Resumen ----------------

function ResumenHorasCard({ proyectoId }: { proyectoId: number }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const { data, isLoading, error } = useResumenHoras(proyectoId, { ...(desde && { desde }), ...(hasta && { hasta }) });

  return (
    <Card>
      <CardHeader title="Horas trabajadas y costo" subtitle={desde || hasta ? 'Periodo seleccionado' : 'Acumulado del proyecto'} />
      <div className="flex gap-3 px-5 pt-4">
        <Input label="Desde" type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} wrapperClassName="flex-1" />
        <Input label="Hasta" type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} wrapperClassName="flex-1" />
      </div>
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <div className="p-5">
          <ErrorState error={error} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 p-5">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Horas trabajadas</p>
              <p className="text-xl font-semibold tabular-nums">{formatNumero(data?.totalHoras ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Costo del equipo</p>
              <p className="text-xl font-semibold tabular-nums">{formatSoles(data?.costoTotal ?? 0)}</p>
            </div>
          </div>
          {data?.trabajadores.length ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {data.trabajadores.map((t) => (
                <li key={t.trabajadorId} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{t.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {t.cargo} · {t.diasTrabajados} día{t.diasTrabajados === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="tabular-nums text-slate-600">{formatNumero(t.horas)} h</span>
                  <span className="w-24 text-right font-medium tabular-nums">{formatSoles(t.costo)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pb-6 text-center text-sm text-slate-500">Sin horas registradas.</p>
          )}
        </>
      )}
    </Card>
  );
}

// ---------------- Asignaciones ----------------

function Asignaciones({ proyectoId, asignaciones }: { proyectoId: number; asignaciones: Asignacion[] }) {
  const [asignando, setAsignando] = useState(false);
  const [cerrando, setCerrando] = useState<Asignacion | null>(null);
  const hoy = hoyInput();

  return (
    <Card>
      <CardHeader
        title="Equipo del proyecto"
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAsignando(true)}>
            Asignar
          </Button>
        }
      />
      {asignaciones.length ? (
        <ul className="divide-y divide-slate-100">
          {asignaciones.map((a) => {
            const vigente = !a.fechaFin || aInputFecha(a.fechaFin) >= hoy;
            return (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{a.trabajador.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {a.trabajador.cargo} · {formatSoles(a.trabajador.costoHora)}/h · desde {formatFecha(a.fechaInicio)}
                    {a.fechaFin && ` hasta ${formatFecha(a.fechaFin)}`}
                  </p>
                </div>
                {vigente ? (
                  <Button size="sm" variant="ghost" icon={<UserMinus className="size-4" />} onClick={() => setCerrando(a)}>
                    Retirar
                  </Button>
                ) : (
                  <Badge>Finalizada</Badge>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Users className="size-6" />} title="Nadie asignado" description="Asigna a los profesionales que trabajarán en este proyecto para registrar sus horas." />
      )}
      <AsignarModal proyectoId={proyectoId} open={asignando} onClose={() => setAsignando(false)} asignaciones={asignaciones} />
      <CerrarModal proyectoId={proyectoId} asignacion={cerrando} onClose={() => setCerrando(null)} />
    </Card>
  );
}

function AsignarModal({ proyectoId, open, onClose, asignaciones }: { proyectoId: number; open: boolean; onClose: () => void; asignaciones: Asignacion[] }) {
  const { data: trabajadores = [] } = useTrabajadores({ activo: true }, open);
  const crear = useCrearAsignacion(proyectoId);
  const [trabajadorId, setTrabajadorId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(hoyInput());

  useEffect(() => {
    if (open) {
      setTrabajadorId('');
      setFechaInicio(hoyInput());
    }
  }, [open]);

  const yaAsignados = new Set(asignaciones.filter((a) => !a.fechaFin || aInputFecha(a.fechaFin) >= hoyInput()).map((a) => a.trabajadorId));
  const disponibles = trabajadores.filter((t) => !yaAsignados.has(t.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar profesional"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              await crear.mutateAsync({ trabajadorId: Number(trabajadorId), fechaInicio });
              onClose();
            }}
            loading={crear.isPending}
            disabled={!trabajadorId || !fechaInicio}
          >
            Asignar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Profesional" value={trabajadorId} onChange={(e) => setTrabajadorId(e.target.value)} hint={disponibles.length ? undefined : 'No hay profesionales disponibles. Regístralos en "Personal y tarifas".'}>
          <option value="">Selecciona…</option>
          {disponibles.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} — {t.cargo}
            </option>
          ))}
        </Select>
        <Input label="Desde" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
      </div>
    </Modal>
  );
}

function CerrarModal({ proyectoId, asignacion, onClose }: { proyectoId: number; asignacion: Asignacion | null; onClose: () => void }) {
  const cerrar = useCerrarAsignacion(proyectoId);
  const [fechaFin, setFechaFin] = useState(hoyInput());
  useEffect(() => setFechaFin(hoyInput()), [asignacion]);

  return (
    <Modal
      open={!!asignacion}
      onClose={onClose}
      title="Retirar del proyecto"
      description={asignacion?.trabajador.nombre}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={cerrar.isPending}
            onClick={async () => {
              if (!asignacion) return;
              await cerrar.mutateAsync({ id: asignacion.id, fechaFin });
              onClose();
            }}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <Input label="Último día en el proyecto" type="date" value={fechaFin} min={aInputFecha(asignacion?.fechaInicio)} onChange={(e) => setFechaFin(e.target.value)} />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="size-3.5" />
        Sus horas ya registradas se conservan.
      </p>
    </Modal>
  );
}
