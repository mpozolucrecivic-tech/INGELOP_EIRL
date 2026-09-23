import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, ClipboardList, ListPlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useUsuarios } from '@/api/admin';
import { useActualizarEntregable, useAplicarPlantilla, useCrearEntregable, useEliminarEntregable, useEntregables } from '@/api/consultoria';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, ProgressBar, Spinner } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { aInputFecha, ESTADO_ENTREGABLE, ESTADO_REVISION, formatFecha, ORDEN_REVISION } from '@/lib/format';
import type { Entregable, EstadoRevision } from '@/types/api';

export default function EntregablesTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const { data: entregables, isLoading, error, refetch } = useEntregables(proyectoId);
  const plantilla = useAplicarPlantilla(proyectoId);
  const actualizar = useActualizarEntregable(proyectoId);
  const eliminar = useEliminarEntregable(proyectoId);
  const { confirm, dialog } = useConfirm();
  const [modal, setModal] = useState<{ entregable?: Entregable } | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const total = entregables?.length ?? 0;
  const aprobados = entregables?.filter((e) => e.estado === 'APROBADO').length ?? 0;
  const vencidos = entregables?.filter((e) => e.vencido).length ?? 0;

  return (
    <>
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <div className="mb-1.5 flex items-baseline justify-between">
              <h3 className="font-semibold text-slate-900">Avance del expediente</h3>
              <span className="text-sm tabular-nums text-slate-600">
                {aprobados} de {total} aprobados
              </span>
            </div>
            <ProgressBar value={total ? (aprobados / total) * 100 : 0} color="green" />
            {vencidos > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700">
                <AlertTriangle className="size-4" />
                {vencidos} entregable{vencidos === 1 ? '' : 's'} con fecha límite vencida
              </p>
            )}
          </div>
          {esAdmin && (
            <div className="flex gap-2">
              <Button variant="secondary" icon={<ListPlus className="size-4" />} onClick={() => plantilla.mutate()} loading={plantilla.isPending}>
                Cargar plantilla de expediente
              </Button>
              <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
                Entregable
              </Button>
            </div>
          )}
        </div>
      </Card>

      {!total ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="Sin entregables"
            description={
              esAdmin
                ? 'Carga la plantilla con los entregables típicos de un expediente técnico (memoria descriptiva, planos, metrados, presupuesto…) o agrégalos uno por uno.'
                : 'El administrador aún no ha definido los entregables de este proyecto.'
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {entregables!.map((e, i) => (
              <li key={e.id} className={clsx('flex flex-wrap items-center gap-3 px-5 py-3', e.vencido && 'bg-red-50/40')}>
                <span className="w-6 text-right text-xs tabular-nums text-slate-400">{i + 1}</span>
                <span className="shrink-0">
                  {e.estado === 'APROBADO' ? <CheckCircle2 className="size-5 text-emerald-500" /> : <span className="block size-5 rounded-full border-2 border-slate-300" />}
                </span>
                <div className="min-w-[200px] flex-1">
                  <p className={clsx('font-medium', e.estado === 'APROBADO' ? 'text-slate-500' : 'text-slate-900')}>{e.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {e.responsable ? e.responsable.nombre : 'Sin responsable'}
                    {e.fechaLimite && (
                      <span className={clsx(e.vencido && 'font-semibold text-red-700')}>
                        {' '}
                        · límite {formatFecha(e.fechaLimite)}
                        {e.vencido && ' (vencido)'}
                      </span>
                    )}
                    {e.fechaEntrega && ` · entregado ${formatFecha(e.fechaEntrega)}`}
                  </p>
                  {e.descripcion && <p className="mt-0.5 text-xs text-slate-600">{e.descripcion}</p>}
                </div>
                {esAdmin ? (
                  <select
                    value={e.estado}
                    onChange={(ev) => actualizar.mutate({ id: e.id, estado: ev.target.value as EstadoRevision })}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                    aria-label={`Estado de ${e.nombre}`}
                  >
                    {ORDEN_REVISION.map((s) => (
                      <option key={s} value={s}>
                        {ESTADO_ENTREGABLE[s]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge color={ESTADO_REVISION[e.estado].color}>{ESTADO_ENTREGABLE[e.estado]}</Badge>
                )}
                {esAdmin && (
                  <div className="flex">
                    <IconButton label="Editar entregable" onClick={() => setModal({ entregable: e })}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label="Eliminar entregable"
                      className="hover:text-red-600"
                      onClick={() => confirm({ title: 'Eliminar entregable', message: `¿Eliminar "${e.nombre}"?`, onConfirm: () => eliminar.mutateAsync(e.id) })}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {esAdmin && <EntregableModal proyectoId={proyectoId} state={modal} onClose={() => setModal(null)} />}
      {dialog}
    </>
  );
}

function EntregableModal({ proyectoId, state, onClose }: { proyectoId: number; state: { entregable?: Entregable } | null; onClose: () => void }) {
  const e = state?.entregable;
  const crear = useCrearEntregable(proyectoId);
  const actualizar = useActualizarEntregable(proyectoId);
  const { data: usuarios = [] } = useUsuarios({ activo: true }, !!state);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [estado, setEstado] = useState<EstadoRevision>('BORRADOR');

  useEffect(() => {
    if (!state) return;
    setNombre(e?.nombre ?? '');
    setDescripcion(e?.descripcion ?? '');
    setFechaLimite(aInputFecha(e?.fechaLimite));
    setFechaEntrega(aInputFecha(e?.fechaEntrega));
    setResponsableId(e?.responsableId ? String(e.responsableId) : '');
    setEstado(e?.estado ?? 'BORRADOR');
  }, [state, e]);

  const guardar = async () => {
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      fechaLimite: fechaLimite || null,
      responsableId: responsableId ? Number(responsableId) : null,
    };
    if (e) await actualizar.mutateAsync({ id: e.id, ...data, estado, fechaEntrega: fechaEntrega || null });
    else await crear.mutateAsync(data);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={e ? 'Editar entregable' : 'Nuevo entregable'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={crear.isPending || actualizar.isPending} disabled={nombre.trim().length < 3}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label="Entregable" wrapperClassName="col-span-2" value={nombre} onChange={(ev) => setNombre(ev.target.value)} placeholder="Ej. Estudio de impacto ambiental" />
        <Textarea label="Descripción" wrapperClassName="col-span-2" rows={2} value={descripcion} onChange={(ev) => setDescripcion(ev.target.value)} placeholder="Opcional" />
        <Select label="Responsable" value={responsableId} onChange={(ev) => setResponsableId(ev.target.value)}>
          <option value="">Sin asignar</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </Select>
        <Input label="Fecha límite" type="date" value={fechaLimite} onChange={(ev) => setFechaLimite(ev.target.value)} />
        {e && (
          <>
            <Select label="Estado" value={estado} onChange={(ev) => setEstado(ev.target.value as EstadoRevision)}>
              {ORDEN_REVISION.map((s) => (
                <option key={s} value={s}>
                  {ESTADO_ENTREGABLE[s]}
                </option>
              ))}
            </Select>
            <Input label="Fecha de entrega" type="date" value={fechaEntrega} onChange={(ev) => setFechaEntrega(ev.target.value)} hint="Se completa sola al aprobar" />
          </>
        )}
      </div>
    </Modal>
  );
}
