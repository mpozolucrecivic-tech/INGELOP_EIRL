import { useEffect, useMemo, useState } from 'react';
import { TextoAyuda } from '@/components/Common';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { Camera, KanbanSquare, Pencil, Plus, Trash2 } from 'lucide-react';
import { useUsuarios } from '@/api/admin';
import {
  keys,
  useActividades,
  useActualizarActividad,
  useActualizarSprint,
  useCrearActividad,
  useCrearSprint,
  useEliminarActividad,
  useEliminarSprint,
  useSprints,
} from '@/api/proyectos';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, ProgressBar, Spinner } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { aInputFecha, ESTADO_ACTIVIDAD, formatFecha, ORDEN_ESTADOS } from '@/lib/format';
import type { Actividad, EstadoActividad, Sprint } from '@/types/api';

export default function TableroTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const { data: sprints, isLoading, error, refetch } = useSprints(proyectoId);
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [sprintModal, setSprintModal] = useState<{ sprint?: Sprint } | null>(null);
  const [actividadModal, setActividadModal] = useState<{ actividad?: Actividad; estado?: EstadoActividad } | null>(null);
  const eliminarSprint = useEliminarSprint(proyectoId);
  const { confirm, dialog } = useConfirm();

  // Por defecto: el sprint vigente, o el último
  useEffect(() => {
    if (!sprints?.length) return;
    if (sprintId && sprints.some((s) => s.id === sprintId)) return;
    setSprintId((sprints.find((s) => s.vigente) ?? sprints[sprints.length - 1]).id);
  }, [sprints, sprintId]);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const sprint = sprints?.find((s) => s.id === sprintId);

  return (
    <>
      <TextoAyuda>Las tareas del equipo, organizadas en periodos de trabajo. Cambia el estado de cada tarea a medida que avanza.</TextoAyuda>
      {!sprints?.length ? (
        <Card>
          <EmptyState
            icon={<KanbanSquare className="size-6" />}
            title="Aún no hay periodos de trabajo"
            description="Divide el proyecto en periodos de 2 a 4 semanas, cada uno con un objetivo (ej. «Planos de arquitectura»), y anota sus tareas."
            action={esAdmin && <Button icon={<Plus className="size-4" />} onClick={() => setSprintModal({})}>Crear el primer periodo</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1">
              {sprints.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSprintId(s.id)}
                  className={clsx(
                    'flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    s.id === sprintId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                  )}
                >
                  Periodo {s.numero}
                  {s.vigente && <span className="size-1.5 rounded-full bg-emerald-400" title="En curso" />}
                </button>
              ))}
            </div>
            {esAdmin && (
              <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setSprintModal({})}>
                Periodo
              </Button>
            )}
          </div>

          {sprint && (
            <Card className="mb-5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">Periodo {sprint.numero}</h2>
                    {sprint.vigente && <Badge color="green">En curso</Badge>}
                    <span className="text-sm text-slate-500">
                      {formatFecha(sprint.fechaInicio)} – {formatFecha(sprint.fechaFin)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{sprint.objetivo}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-40">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>Avance</span>
                      <span className="font-medium tabular-nums text-slate-700">{Math.round(sprint.avance)}%</span>
                    </div>
                    <ProgressBar value={sprint.avance} color="green" />
                  </div>
                  {esAdmin && (
                    <div className="flex">
                      <IconButton label="Editar periodo" onClick={() => setSprintModal({ sprint })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Eliminar periodo"
                        className="hover:text-red-600"
                        onClick={() =>
                          confirm({
                            title: `Eliminar el periodo ${sprint.numero}`,
                            message: `Se eliminarán también sus ${sprint.totalActividades} tareas. Esta acción no se puede deshacer.`,
                            onConfirm: async () => {
                              await eliminarSprint.mutateAsync(sprint.id);
                              setSprintId(null);
                            },
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {sprint && (
            <Kanban
              proyectoId={proyectoId}
              sprintId={sprint.id}
              editable={esAdmin}
              onAdd={(estado) => setActividadModal({ estado })}
              onOpen={(actividad) => setActividadModal({ actividad })}
            />
          )}
        </>
      )}

      {esAdmin && (
        <>
          <SprintModal
            proyectoId={proyectoId}
            state={sprintModal}
            onClose={() => setSprintModal(null)}
            onCreated={(s) => setSprintId(s.id)}
          />
          {sprint && (
            <ActividadModal
              proyectoId={proyectoId}
              sprints={sprints ?? []}
              sprintId={sprint.id}
              state={actividadModal}
              onClose={() => setActividadModal(null)}
            />
          )}
        </>
      )}
      {dialog}
    </>
  );
}

// ---------------- Kanban ----------------

function Kanban({
  proyectoId,
  sprintId,
  editable,
  onAdd,
  onOpen,
}: {
  proyectoId: number;
  sprintId: number;
  editable: boolean;
  onAdd: (estado: EstadoActividad) => void;
  onOpen: (a: Actividad) => void;
}) {
  const queryClient = useQueryClient();
  const { data: actividades, isLoading, error, refetch } = useActividades(sprintId);
  const actualizar = useActualizarActividad(proyectoId);
  const [arrastrando, setArrastrando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<EstadoActividad | null>(null);

  const columnas = useMemo(
    () => ORDEN_ESTADOS.map((estado) => ({ estado, items: (actividades ?? []).filter((a) => a.estado === estado) })),
    [actividades],
  );

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const mover = (id: number, estado: EstadoActividad) => {
    const actual = actividades?.find((a) => a.id === id);
    if (!actual || actual.estado === estado) return;
    // Actualización optimista: la tarjeta se mueve al instante; si la API falla se revierte
    const key = keys.actividades(sprintId);
    const previo = queryClient.getQueryData<Actividad[]>(key);
    const avance = estado === 'COMPLETADA' ? 100 : actual.avance;
    queryClient.setQueryData<Actividad[]>(key, (old) => old?.map((a) => (a.id === id ? { ...a, estado, avance } : a)));
    actualizar.mutate({ id, estado }, { onError: () => queryClient.setQueryData(key, previo) });
  };

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1000px] grid-cols-5 gap-3">
        {columnas.map(({ estado, items }) => (
          <section
            key={estado}
            aria-label={ESTADO_ACTIVIDAD[estado].label}
            onDragOver={(e) => {
              if (!editable || arrastrando == null) return;
              e.preventDefault();
              setSobre(estado);
            }}
            onDragLeave={() => setSobre((s) => (s === estado ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = Number(e.dataTransfer.getData('text/plain'));
              if (id) mover(id, estado);
              setSobre(null);
              setArrastrando(null);
            }}
            className={clsx(
              'flex min-h-[420px] flex-col rounded-xl border bg-slate-100/70 p-2 transition-colors',
              sobre === estado ? 'border-brand-400 bg-brand-50' : 'border-transparent',
            )}
          >
            <header className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className={`size-2 rounded-full ${ESTADO_ACTIVIDAD[estado].dot}`} />
                {ESTADO_ACTIVIDAD[estado].label}
                <span className="rounded-full bg-white px-1.5 text-xs font-medium text-slate-500">{items.length}</span>
              </div>
              {editable && (
                <IconButton label={`Agregar actividad en ${ESTADO_ACTIVIDAD[estado].label}`} className="size-7" onClick={() => onAdd(estado)}>
                  <Plus className="size-4" />
                </IconButton>
              )}
            </header>
            <div className="mt-1 flex flex-1 flex-col gap-2">
              {items.map((a) => (
                <article
                  key={a.id}
                  draggable={editable}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(a.id));
                    e.dataTransfer.effectAllowed = 'move';
                    setArrastrando(a.id);
                  }}
                  onDragEnd={() => {
                    setArrastrando(null);
                    setSobre(null);
                  }}
                  onClick={() => editable && onOpen(a)}
                  onKeyDown={(e) => editable && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen(a))}
                  tabIndex={editable ? 0 : undefined}
                  role={editable ? 'button' : undefined}
                  className={clsx(
                    'rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition',
                    editable && 'cursor-grab hover:border-slate-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:cursor-grabbing',
                    arrastrando === a.id && 'opacity-40',
                  )}
                >
                  <p className="text-sm font-medium leading-snug text-slate-800">{a.nombre}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <ProgressBar value={a.avance} color={a.estado === 'COMPLETADA' ? 'green' : 'brand'} className="h-1.5" />
                    <span className="text-xs tabular-nums text-slate-500">{a.avance}%</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                        {a.responsable.nombre.charAt(0)}
                      </span>
                      <span className="truncate">{a.responsable.nombre}</span>
                    </span>
                    {a._count.evidencias > 0 && (
                      <span className="flex shrink-0 items-center gap-1" title="Evidencias">
                        <Camera className="size-3.5" />
                        {a._count.evidencias}
                      </span>
                    )}
                  </div>
                </article>
              ))}
              {!items.length && <p className="px-2 py-6 text-center text-xs text-slate-400">{editable ? 'Arrastra tarjetas aquí' : 'Sin actividades'}</p>}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ---------------- Modales ----------------

const sprintSchema = z
  .object({
    numero: z.number().int().positive().optional(),
    fechaInicio: z.string().min(1, 'Requerido'),
    fechaFin: z.string().min(1, 'Requerido'),
    objetivo: z.string().trim().min(3, 'Describe el objetivo del periodo'),
  })
  .refine((d) => d.fechaFin >= d.fechaInicio, { message: 'Debe ser posterior al inicio', path: ['fechaFin'] });
type SprintForm = z.infer<typeof sprintSchema>;

function SprintModal({
  proyectoId,
  state,
  onClose,
  onCreated,
}: {
  proyectoId: number;
  state: { sprint?: Sprint } | null;
  onClose: () => void;
  onCreated: (s: Sprint) => void;
}) {
  const crear = useCrearSprint(proyectoId);
  const actualizar = useActualizarSprint(proyectoId);
  const sprint = state?.sprint;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SprintForm>({ resolver: zodResolver(sprintSchema) });

  useEffect(() => {
    if (!state) return;
    reset(
      sprint
        ? { numero: sprint.numero, fechaInicio: aInputFecha(sprint.fechaInicio), fechaFin: aInputFecha(sprint.fechaFin), objetivo: sprint.objetivo }
        : { numero: undefined, fechaInicio: '', fechaFin: '', objetivo: '' },
    );
  }, [state, sprint, reset]);

  const onSubmit = async (data: SprintForm) => {
    if (sprint) await actualizar.mutateAsync({ id: sprint.id, ...data });
    else onCreated(await crear.mutateAsync(data));
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={sprint ? `Editar el periodo ${sprint.numero}` : 'Nuevo periodo de trabajo'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="sprint-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="sprint-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Fecha de inicio" type="date" error={errors.fechaInicio?.message} {...register('fechaInicio')} />
        <Input label="Fecha de fin" type="date" error={errors.fechaFin?.message} {...register('fechaFin')} />
        <Textarea label="Objetivo" wrapperClassName="col-span-2" placeholder="Ej. Vaciado de losa aligerada del segundo nivel" error={errors.objetivo?.message} {...register('objetivo')} />
        <Input
          label="Número"
          type="number"
          min={1}
          hint={sprint ? undefined : 'Opcional: se asigna el siguiente'}
          error={errors.numero?.message}
          {...register('numero', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        />
      </form>
    </Modal>
  );
}

const actividadSchema = z.object({
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres'),
  responsableId: z.number({ invalid_type_error: 'Selecciona un responsable', required_error: 'Selecciona un responsable' }),
  estado: z.enum(['BACKLOG', 'POR_HACER', 'EN_PROCESO', 'EN_REVISION', 'COMPLETADA']),
  avance: z.number({ invalid_type_error: 'Ingresa un número' }).int('Debe ser entero').min(0).max(100, 'Máximo 100'),
  sprintId: z.number(),
});
type ActividadForm = z.infer<typeof actividadSchema>;

function ActividadModal({
  proyectoId,
  sprints,
  sprintId,
  state,
  onClose,
}: {
  proyectoId: number;
  sprints: Sprint[];
  sprintId: number;
  state: { actividad?: Actividad; estado?: EstadoActividad } | null;
  onClose: () => void;
}) {
  const actividad = state?.actividad;
  const crear = useCrearActividad(proyectoId, sprintId);
  const actualizar = useActualizarActividad(proyectoId);
  const eliminar = useEliminarActividad(proyectoId);
  const { data: usuarios = [] } = useUsuarios({ activo: true }, !!state);
  const { confirm, dialog, abierto: confirmando } = useConfirm();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ActividadForm>({ resolver: zodResolver(actividadSchema) });

  useEffect(() => {
    if (!state) return;
    reset(
      actividad
        ? { nombre: actividad.nombre, responsableId: actividad.responsableId, estado: actividad.estado, avance: actividad.avance, sprintId: actividad.sprintId }
        : { nombre: '', responsableId: undefined, estado: state.estado ?? 'BACKLOG', avance: 0, sprintId },
    );
  }, [state, actividad, sprintId, reset]);

  const estado = watch('estado');
  useEffect(() => {
    if (estado === 'COMPLETADA') setValue('avance', 100);
  }, [estado, setValue]);

  const onSubmit = async (data: ActividadForm) => {
    if (actividad) {
      await actualizar.mutateAsync({ id: actividad.id, ...data });
    } else {
      const { sprintId: _ignorado, ...resto } = data;
      void _ignorado;
      await crear.mutateAsync(resto);
    }
    onClose();
  };

  return (
    <>
      <Modal
        open={!!state && !confirmando}
        onClose={onClose}
        title={actividad ? 'Editar actividad' : 'Nueva actividad'}
        footer={
          <>
            {actividad && (
              <Button
                variant="ghost"
                className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                icon={<Trash2 className="size-4" />}
                onClick={() =>
                  confirm({
                    title: 'Eliminar actividad',
                    message: `¿Eliminar "${actividad.nombre}"? Sus evidencias se conservarán sin actividad asociada.`,
                    onConfirm: async () => {
                      await eliminar.mutateAsync(actividad.id);
                      onClose();
                    },
                  })
                }
              >
                Eliminar
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="actividad-form" loading={crear.isPending || actualizar.isPending}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="actividad-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
          <Input label="Actividad" wrapperClassName="col-span-2" placeholder="Ej. Encofrado de vigas eje A-B" error={errors.nombre?.message} {...register('nombre')} />
          <Select
            label="Responsable"
            wrapperClassName="col-span-2"
            error={errors.responsableId?.message}
            {...register('responsableId', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
          >
            <option value="">Selecciona…</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
          <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
            {ORDEN_ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_ACTIVIDAD[e].label}
              </option>
            ))}
          </Select>
          <Input label="Avance (%)" type="number" min={0} max={100} error={errors.avance?.message} {...register('avance', { valueAsNumber: true })} />
          {actividad && (
            <Select label="Periodo" wrapperClassName="col-span-2" {...register('sprintId', { valueAsNumber: true })}>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  Periodo {s.numero} · {s.objetivo}
                </option>
              ))}
            </Select>
          )}
        </form>
      </Modal>
      {dialog}
    </>
  );
}
