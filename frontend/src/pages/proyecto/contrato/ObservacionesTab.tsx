import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquareWarning, Pencil, Plus, Trash2 } from 'lucide-react';
import { useUsuarios } from '@/api/admin';
import { useActualizarObservacion, useCorrespondencia, useCrearObservacion, useEliminarObservacion, useObservaciones } from '@/api/contrato';
import { useEtapas } from '@/api/documentos';
import { useUsuariosProyecto } from '@/api/proyectos';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, StatCard } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { aInputFecha, ESTADO_OBSERVACION, formatFecha, hoyInput, TIPO_ETAPA } from '@/lib/format';
import type { EstadoObservacion, ObservacionEntidad } from '@/types/api';

const dias = (n: number) => (n === 1 ? '1 día' : `${n} días`);

/** Texto y color del plazo de una observación abierta */
function plazo(o: ObservacionEntidad) {
  if (o.diasParaVencer === null) return null;
  if (o.diasParaVencer < 0) return { texto: `Plazo vencido hace ${dias(-o.diasParaVencer)}`, clase: 'font-semibold text-red-600' };
  if (o.diasParaVencer === 0) return { texto: 'Vence hoy', clase: 'font-semibold text-red-600' };
  if (o.diasParaVencer <= 2) return { texto: o.diasParaVencer === 1 ? 'Vence mañana' : `Vence en ${dias(o.diasParaVencer)}`, clase: 'font-semibold text-amber-700' };
  return { texto: `Vence el ${formatFecha(o.fechaLimite!)}`, clase: 'text-slate-500' };
}

export default function ObservacionesTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin, usuario } = useAuth();
  const { data, isLoading, error, refetch } = useObservaciones(proyectoId);
  const eliminar = useEliminarObservacion(proyectoId);
  const { confirm, dialog } = useConfirm();
  const [modal, setModal] = useState<{ observacion?: ObservacionEntidad } | null>(null);
  const r = data?.resumen;

  return (
    <div className="space-y-6">
      <TextoAyuda>
        Observaciones formales de la entidad (oficios, informes de revisión) con su plazo para levantarlas. La campana avisa 2 días antes del vencimiento al responsable y a la
        jefatura.
      </TextoAyuda>

      {r && r.total > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Abiertas" value={r.abiertas} tone={r.abiertas ? 'warning' : 'default'} hint="Pendientes o en proceso" />
          <StatCard label="Con plazo vencido" value={r.vencidas} tone={r.vencidas ? 'danger' : 'default'} hint={r.vencidas ? 'Atenderlas evita penalidades' : 'Ninguna vencida'} />
          <StatCard label="Levantadas" value={r.levantadas} tone="success" hint={`de ${r.total} recibidas`} />
        </div>
      )}

      <Card>
        <CardHeader
          title="Observaciones de la entidad"
          action={
            esAdmin && (
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({})}>
                Observación
              </Button>
            )
          }
        />
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.observaciones.length ? (
          <EmptyState icon={<MessageSquareWarning className="size-6" />} title="Sin observaciones" description="Cuando la entidad envíe observaciones, regístralas aquí con su plazo." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.observaciones.map((o) => {
              const p = plazo(o);
              const abierta = o.estado === 'PENDIENTE' || o.estado === 'EN_PROCESO';
              const puedeEditar = esAdmin || abierta;
              return (
                <li key={o.id} className="flex gap-4 px-5 py-4">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-700">{o.numero}</span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={ESTADO_OBSERVACION[o.estado].color}>{ESTADO_OBSERVACION[o.estado].label}</Badge>
                      <span className="text-sm font-medium text-slate-900">{o.documento}</span>
                      <span className="text-xs text-slate-500">recibida el {formatFecha(o.fechaRecepcion)}</span>
                      {o.etapa && <Badge color="slate">{TIPO_ETAPA[o.etapa.tipo]}</Badge>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{o.descripcion}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Responsable: {o.responsable?.nombre ?? 'sin asignar'}</span>
                      {p && <span className={p.clase}>{p.texto}</span>}
                      {o.fechaRespuesta && <span>Respondida el {formatFecha(o.fechaRespuesta)}</span>}
                      {o.correspondencia && <span>Con {o.correspondencia.numero}</span>}
                    </div>
                    {o.respuesta && <p className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{o.respuesta}</p>}
                  </div>
                  <div className="flex shrink-0 items-start">
                    {puedeEditar && (
                      <IconButton label={esAdmin ? 'Editar observación' : 'Actualizar avance'} onClick={() => setModal({ observacion: o })}>
                        <Pencil className="size-4" />
                      </IconButton>
                    )}
                    {esAdmin && (
                      <IconButton
                        label="Eliminar observación"
                        className="hover:text-red-600"
                        onClick={() => confirm({ title: 'Eliminar observación', message: `¿Eliminar la observación N.° ${o.numero}?`, onConfirm: () => eliminar.mutateAsync(o.id) })}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {esAdmin ? (
        <ObservacionModal proyectoId={proyectoId} state={modal} onClose={() => setModal(null)} />
      ) : (
        <AvanceModal proyectoId={proyectoId} observacion={modal?.observacion ?? null} onClose={() => setModal(null)} esResponsable={modal?.observacion?.responsable?.id === usuario?.id} />
      )}
      {dialog}
    </div>
  );
}

const schema = z
  .object({
    documento: z.string().trim().min(3, 'Indica el oficio o informe').max(200),
    fechaRecepcion: z.string().min(1, 'Requerido'),
    fechaLimite: z.string(),
    descripcion: z.string().trim().min(5, 'Describe la observación').max(5000),
    etapaId: z.string(),
    responsableId: z.string(),
    estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'LEVANTADA', 'NO_PROCEDE']),
    respuesta: z.string().max(5000),
    fechaRespuesta: z.string(),
    correspondenciaId: z.string(),
  })
  .refine((d) => !d.fechaLimite || d.fechaLimite >= d.fechaRecepcion, { message: 'No puede ser anterior a la recepción', path: ['fechaLimite'] });
type FormData = z.infer<typeof schema>;

const idONull = (v: string) => (v ? Number(v) : null);

function ObservacionModal({ proyectoId, state, onClose }: { proyectoId: number; state: { observacion?: ObservacionEntidad } | null; onClose: () => void }) {
  const o = state?.observacion;
  const crear = useCrearObservacion(proyectoId);
  const actualizar = useActualizarObservacion(proyectoId);
  const { data: etapas } = useEtapas(proyectoId);
  const { data: equipo } = useUsuariosProyecto(proyectoId, !!state);
  const { data: jefes } = useUsuarios({ rol: 'ADMIN', activo: true }, !!state);
  const { data: cartas } = useCorrespondencia(proyectoId, { tipo: 'ENVIADA' });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset({
      documento: o?.documento ?? '',
      fechaRecepcion: aInputFecha(o?.fechaRecepcion) || hoyInput(),
      fechaLimite: aInputFecha(o?.fechaLimite),
      descripcion: o?.descripcion ?? '',
      etapaId: o?.etapa ? String(o.etapa.id) : '',
      responsableId: o?.responsable ? String(o.responsable.id) : '',
      estado: o?.estado ?? 'PENDIENTE',
      respuesta: o?.respuesta ?? '',
      fechaRespuesta: aInputFecha(o?.fechaRespuesta),
      correspondenciaId: o?.correspondencia ? String(o.correspondencia.id) : '',
    });
  }, [state, o, reset]);

  const estado = watch('estado');
  const cerrada = estado === 'LEVANTADA' || estado === 'NO_PROCEDE';
  const personas = [...(equipo?.filter((u) => u.activo) ?? []), ...(jefes ?? [])].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);

  const onSubmit = async (f: FormData) => {
    const data = {
      documento: f.documento,
      fechaRecepcion: f.fechaRecepcion,
      fechaLimite: f.fechaLimite || null,
      descripcion: f.descripcion,
      etapaId: idONull(f.etapaId),
      responsableId: idONull(f.responsableId),
      estado: f.estado,
      respuesta: f.respuesta.trim() || null,
      fechaRespuesta: f.fechaRespuesta || null,
      correspondenciaId: idONull(f.correspondenciaId),
    };
    if (o) await actualizar.mutateAsync({ id: o.id, ...data });
    else await crear.mutateAsync(data);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={o ? `Observación N.° ${o.numero}` : 'Registrar observación de la entidad'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="observacion-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="observacion-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Input label="Documento" wrapperClassName="sm:col-span-2" placeholder="Ej. Oficio N.° 123-2026-MDLV/GDU" error={errors.documento?.message} {...register('documento')} />
        <Input label="Fecha de recepción" type="date" error={errors.fechaRecepcion?.message} {...register('fechaRecepcion')} />
        <Input label="Plazo para levantarla" type="date" hint="Opcional" error={errors.fechaLimite?.message} {...register('fechaLimite')} />
        <Textarea label="Observación" wrapperClassName="sm:col-span-2" rows={3} error={errors.descripcion?.message} {...register('descripcion')} />
        <Select label="Responsable" error={errors.responsableId?.message} {...register('responsableId')}>
          <option value="">Sin asignar</option>
          {personas.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </Select>
        <Select label="Etapa" error={errors.etapaId?.message} {...register('etapaId')}>
          <option value="">—</option>
          {etapas?.map((e) => (
            <option key={e.id} value={e.id}>
              {TIPO_ETAPA[e.tipo]}
            </option>
          ))}
        </Select>
        <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
          {(Object.keys(ESTADO_OBSERVACION) as EstadoObservacion[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_OBSERVACION[e].label}
            </option>
          ))}
        </Select>
        {cerrada ? (
          <Input label="Fecha de respuesta" type="date" hint="Si la dejas vacía, se usa la de hoy" error={errors.fechaRespuesta?.message} {...register('fechaRespuesta')} />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Textarea label="Respuesta / cómo se levantó" wrapperClassName="sm:col-span-2" rows={3} error={errors.respuesta?.message} {...register('respuesta')} />
        <Select label="Carta con la que se presentó" wrapperClassName="sm:col-span-2" hint="Se registran en Correspondencia" error={errors.correspondenciaId?.message} {...register('correspondenciaId')}>
          <option value="">—</option>
          {cartas?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero} · {c.asunto}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}

const schemaAvance = z.object({ estado: z.enum(['PENDIENTE', 'EN_PROCESO']), respuesta: z.string().max(5000) });
type FormAvance = z.infer<typeof schemaAvance>;

/** Arquitecto o ingeniero: marcar en proceso y redactar la respuesta. La jefatura la da por levantada. */
function AvanceModal({ proyectoId, observacion, onClose, esResponsable }: { proyectoId: number; observacion: ObservacionEntidad | null; onClose: () => void; esResponsable: boolean }) {
  const actualizar = useActualizarObservacion(proyectoId);
  const { register, handleSubmit, reset } = useForm<FormAvance>({ resolver: zodResolver(schemaAvance) });

  useEffect(() => {
    if (observacion) reset({ estado: observacion.estado === 'PENDIENTE' ? 'PENDIENTE' : 'EN_PROCESO', respuesta: observacion.respuesta ?? '' });
  }, [observacion, reset]);

  const onSubmit = async (f: FormAvance) => {
    await actualizar.mutateAsync({ id: observacion!.id, estado: f.estado, respuesta: f.respuesta.trim() || null });
    onClose();
  };

  return (
    <Modal
      open={!!observacion}
      onClose={onClose}
      title={observacion ? `Observación N.° ${observacion.numero}` : ''}
      description={esResponsable ? 'Estás a cargo de esta observación.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="avance-form" loading={actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="avance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {observacion && <p className="whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{observacion.descripcion}</p>}
        <Select label="Estado" {...register('estado')}>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En proceso (estoy corrigiendo)</option>
        </Select>
        <Textarea label="Respuesta propuesta" rows={4} hint="La jefatura la revisa y la marca como levantada al presentarla." {...register('respuesta')} />
      </form>
    </Modal>
  );
}
