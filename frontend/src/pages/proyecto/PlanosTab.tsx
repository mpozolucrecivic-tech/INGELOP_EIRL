import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { TextoAyuda } from '@/components/Common';
import clsx from 'clsx';
import { CheckCircle2, Download, Eye, FileStack, History, MessageSquareWarning, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { useUsuarios } from '@/api/admin';
import { obtenerArchivo } from '@/api/client';
import { useActualizarPlano, useCrearPlano, useEliminarPlano, usePlano, usePlanos, useSubirVersion } from '@/api/consultoria';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ESPECIALIDAD, ESTADO_REVISION, formatBytes, formatFecha, formatFechaHora, ORDEN_REVISION, revisionLetra } from '@/lib/format';
import type { Especialidad, EstadoRevision, Plano, PlanoVersion } from '@/types/api';

const ESPECIALIDADES = Object.keys(ESPECIALIDAD) as Especialidad[];
const EXTENSIONES = '.pdf,.dwg,.dxf,.rvt,.ifc,.skp,.jpg,.jpeg,.png,.zip';
const MAX_MB = 50;
const visible = (nombre: string) => /\.(pdf|png|jpe?g)$/i.test(nombre);

/** Descarga (o abre, si es PDF/imagen y ver=true) una revisión protegida con JWT */
async function abrirVersion(v: PlanoVersion, ver = false) {
  const ventana = ver ? window.open('', '_blank') : null;
  const url = await obtenerArchivo(`${v.descargaUrl}${ver ? '?ver=true' : ''}`);
  if (ver && ventana) {
    ventana.location.href = url;
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = v.nombreArchivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function PlanosTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const [especialidad, setEspecialidad] = useState<Especialidad | ''>('');
  const [estado, setEstado] = useState<EstadoRevision | ''>('');
  const [nuevo, setNuevo] = useState(false);
  const [subir, setSubir] = useState<Plano | null>(null);
  const [historial, setHistorial] = useState<number | null>(null);
  const [revisar, setRevisar] = useState<{ plano: Plano; accion: 'APROBADO' | 'OBSERVADO' } | null>(null);
  const [editar, setEditar] = useState<Plano | null>(null);
  const { data: planos, isLoading, error, refetch } = usePlanos(proyectoId, {
    ...(especialidad && { especialidad }),
    ...(estado && { estado }),
  });
  const eliminar = useEliminarPlano(proyectoId);
  const { confirm, dialog } = useConfirm();

  const grupos = useMemo(() => {
    const m = new Map<Especialidad, Plano[]>();
    for (const p of planos ?? []) m.set(p.especialidad, [...(m.get(p.especialidad) ?? []), p]);
    return ESPECIALIDADES.filter((e) => m.has(e)).map((e) => ({ especialidad: e, planos: m.get(e)! }));
  }, [planos]);

  const resumen = useMemo(() => {
    const r = Object.fromEntries(ORDEN_REVISION.map((e) => [e, 0])) as Record<EstadoRevision, number>;
    for (const p of planos ?? []) r[p.estado]++;
    return r;
  }, [planos]);

  const acciones = (p: Plano) => (
    <div className="flex flex-wrap justify-end gap-1">
    {p.ultimaVersion && visible(p.ultimaVersion.nombreArchivo) && (
      <IconButton label="Ver" onClick={() => abrirVersion(p.ultimaVersion!, true)}>
        <Eye className="size-4" />
      </IconButton>
    )}
    {p.ultimaVersion && (
      <IconButton label="Descargar última revisión" onClick={() => abrirVersion(p.ultimaVersion!)}>
        <Download className="size-4" />
      </IconButton>
    )}
    <IconButton label="Subir nueva revisión" onClick={() => setSubir(p)}>
      <Upload className="size-4" />
    </IconButton>
    <IconButton label="Historial de revisiones" onClick={() => setHistorial(p.id)} disabled={!p.totalVersiones}>
      <History className="size-4" />
    </IconButton>
    {esAdmin && p.estado === 'EN_REVISION' && (
      <>
        <Button size="sm" variant="secondary" icon={<CheckCircle2 className="size-4 text-emerald-600" />} onClick={() => setRevisar({ plano: p, accion: 'APROBADO' })}>
          Aprobar
        </Button>
        <Button size="sm" variant="secondary" icon={<MessageSquareWarning className="size-4 text-red-600" />} onClick={() => setRevisar({ plano: p, accion: 'OBSERVADO' })}>
          Observar
        </Button>
      </>
    )}
    {esAdmin && (
      <>
        <IconButton label="Editar datos del plano" onClick={() => setEditar(p)}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton
          label="Eliminar plano"
          className="hover:text-red-600"
          onClick={() =>
            confirm({
              title: `Eliminar ${p.codigo}`,
              message: `Se eliminará el plano "${p.titulo}" con sus ${p.totalVersiones} revisiones y archivos.`,
              onConfirm: () => eliminar.mutateAsync(p.id),
            })
          }
        >
          <Trash2 className="size-4" />
        </IconButton>
      </>
    )}
  </div>
  );

  return (
    <>
      <TextoAyuda>Cada lámina se registra por especialidad. Las jefaturas la aprueban u observan, y cada corrección se sube como una revisión nueva (Rev. A, B, C…).</TextoAyuda>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Select value={especialidad} onChange={(e) => setEspecialidad(e.target.value as Especialidad | '')} aria-label="Especialidad" wrapperClassName="w-full sm:w-60">
            <option value="">Todas las especialidades</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e} value={e}>
                {ESPECIALIDAD[e].label}
              </option>
            ))}
          </Select>
          <Select value={estado} onChange={(e) => setEstado(e.target.value as EstadoRevision | '')} aria-label="Estado" wrapperClassName="w-full sm:w-48">
            <option value="">Todos los estados</option>
            {ORDEN_REVISION.map((e) => (
              <option key={e} value={e}>
                {ESTADO_REVISION[e].label}
              </option>
            ))}
          </Select>
        </div>
        <Button icon={<Plus className="size-4" />} onClick={() => setNuevo(true)}>
          Nuevo plano
        </Button>
      </div>

      {!!planos?.length && !especialidad && !estado && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {ORDEN_REVISION.map((e) => (
            <span key={e} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5">
              <Badge color={ESTADO_REVISION[e].color}>{ESTADO_REVISION[e].label}</Badge>
              <span className="font-semibold tabular-nums">{resumen[e]}</span>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !planos?.length ? (
        <Card>
          <EmptyState
            icon={<FileStack className="size-6" />}
            title={especialidad || estado ? 'Sin planos con ese filtro' : 'Aún no hay planos'}
            description="Registra las láminas del proyecto por especialidad y sube cada revisión para su aprobación."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <Card key={g.especialidad}>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <h3 className="font-semibold text-slate-900">{ESPECIALIDAD[g.especialidad].label}</h3>
                <span className="text-xs text-slate-500">
                  {g.planos.filter((p) => p.estado === 'APROBADO').length} de {g.planos.length} aprobados
                </span>
              </div>
              <div className="hidden md:block">
              <Table className="table-fixed min-w-[900px]">
                <thead>
                  <tr>
                    <th className={`${th} w-24`}>Código</th>
                    <th className={th}>Lámina</th>
                    <th className={`${th} w-32`}>Estado</th>
                    <th className={`${th} w-32`}>Revisión</th>
                    <th className={`${th} w-44`}>Responsable</th>
                    <th className={`${th} w-[23rem] text-right`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {g.planos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className={`${td} font-mono text-sm font-semibold text-slate-900`}>{p.codigo}</td>
                      <td className={td}>
                        <p className="font-medium text-slate-800">{p.titulo}</p>
                        {p.estado === 'OBSERVADO' && p.observacion && (
                          <p className="mt-1 flex items-start gap-1 text-xs text-red-700">
                            <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
                            {p.observacion}
                          </p>
                        )}
                      </td>
                      <td className={td}>
                        <Badge color={ESTADO_REVISION[p.estado].color}>{ESTADO_REVISION[p.estado].label}</Badge>
                      </td>
                      <td className={`${td} whitespace-nowrap`}>
                        {p.ultimaVersion ? (
                          <button onClick={() => setHistorial(p.id)} className="text-left hover:underline">
                            <span className="font-semibold">Rev. {revisionLetra(p.ultimaVersion.revision)}</span>
                            <span className="block text-xs text-slate-500">{formatFecha(p.ultimaVersion.fecha)}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sin archivo</span>
                        )}
                      </td>
                      <td className={`${td} text-slate-600`}>{p.responsable?.nombre ?? '—'}</td>
                      <td className={td}>
                        {acciones(p)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              </div>
              {/* Celular: tarjetas en lugar de tabla */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {g.planos.map((p) => (
                  <li key={p.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-slate-900">{p.codigo}</p>
                        <p className="text-sm text-slate-800">{p.titulo}</p>
                      </div>
                      <Badge color={ESTADO_REVISION[p.estado].color}>{ESTADO_REVISION[p.estado].label}</Badge>
                    </div>
                    {p.estado === 'OBSERVADO' && p.observacion && (
                      <p className="flex items-start gap-1 rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
                        <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
                        {p.observacion}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {p.ultimaVersion ? `Rev. ${revisionLetra(p.ultimaVersion.revision)} · ${formatFecha(p.ultimaVersion.fecha)}` : 'Sin archivo'}
                      {p.responsable && ` · ${p.responsable.nombre}`}
                    </p>
                    <div className="-ml-2 flex flex-wrap">{acciones(p)}</div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <NuevoPlanoModal proyectoId={proyectoId} open={nuevo} onClose={() => setNuevo(false)} esAdmin={esAdmin} />
      <SubirVersionModal proyectoId={proyectoId} plano={subir} onClose={() => setSubir(null)} />
      <HistorialModal planoId={historial} onClose={() => setHistorial(null)} />
      <RevisarModal proyectoId={proyectoId} state={revisar} onClose={() => setRevisar(null)} />
      <EditarPlanoModal proyectoId={proyectoId} plano={editar} onClose={() => setEditar(null)} />
      {dialog}
    </>
  );
}

// ---------------- Selector de archivo ----------------

function SelectorArchivo({ archivo, onChange, error }: { archivo: File | null; onChange: (f: File | null) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [errorTam, setErrorTam] = useState<string | null>(null);
  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setErrorTam(`El archivo supera ${MAX_MB} MB`);
      return;
    }
    setErrorTam(null);
    onChange(f);
  };
  return (
    <div>
      <input ref={ref} type="file" accept={EXTENSIONES} onChange={elegir} className="hidden" />
      {archivo ? (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2.5">
          <FileStack className="size-8 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{archivo.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(archivo.size)}</p>
          </div>
          <IconButton label="Quitar archivo" onClick={() => onChange(null)}>
            <X className="size-4" />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={clsx(
            'flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors hover:border-brand-400 hover:bg-brand-50/50',
            error || errorTam ? 'border-red-300' : 'border-slate-300',
          )}
        >
          <Upload className="size-6 text-slate-400" />
          <span className="font-medium text-slate-700">Elegir archivo del plano</span>
          <span className="text-xs text-slate-500">PDF, DWG, DXF, RVT, IFC, SKP, imagen o ZIP · máx. {MAX_MB} MB</span>
        </button>
      )}
      {(error || errorTam) && <p className="mt-1 text-xs text-red-600">{error || errorTam}</p>}
    </div>
  );
}

// ---------------- Modales ----------------

function NuevoPlanoModal({ proyectoId, open, onClose, esAdmin }: { proyectoId: number; open: boolean; onClose: () => void; esAdmin: boolean }) {
  const crear = useCrearPlano(proyectoId);
  const { data: usuarios = [] } = useUsuarios({ activo: true }, open && esAdmin);
  const [especialidad, setEspecialidad] = useState<Especialidad>('ARQUITECTURA');
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [comentario, setComentario] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setEspecialidad('ARQUITECTURA');
    setCodigo('A-');
    setTitulo('');
    setResponsableId('');
    setComentario('');
    setArchivo(null);
    setErrores({});
  }, [open]);

  const cambiarEspecialidad = (e: Especialidad) => {
    // Sugiere el prefijo de lámina si el código aún no se personalizó
    const prefijoAnterior = `${ESPECIALIDAD[especialidad].prefijo}-`;
    if (!codigo || codigo === prefijoAnterior) setCodigo(`${ESPECIALIDAD[e].prefijo}-`);
    setEspecialidad(e);
  };

  const guardar = async () => {
    const errs: Record<string, string> = {};
    if (!/^[A-Za-z0-9][A-Za-z0-9.\-_/]*$/.test(codigo.trim()) || codigo.trim().endsWith('-')) errs.codigo = 'Ej. A-01, E-03, IS-02';
    if (titulo.trim().length < 3) errs.titulo = 'Mínimo 3 caracteres';
    setErrores(errs);
    if (Object.keys(errs).length) return;
    await crear.mutateAsync({
      codigo: codigo.trim(),
      titulo: titulo.trim(),
      especialidad,
      responsableId: responsableId ? Number(responsableId) : undefined,
      comentario: comentario.trim() || undefined,
      archivo,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo plano"
      description="Si adjuntas el archivo, se registra como Rev. A y pasa a revisión."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={guardar} loading={crear.isPending}>
            {archivo ? 'Registrar y enviar a revisión' : 'Registrar plano'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Select label="Especialidad" value={especialidad} onChange={(e) => cambiarEspecialidad(e.target.value as Especialidad)}>
          {ESPECIALIDADES.map((e) => (
            <option key={e} value={e}>
              {ESPECIALIDAD[e].label}
            </option>
          ))}
        </Select>
        <Input label="Código de lámina" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} error={errores.codigo} placeholder="A-01" />
        <Input label="Título" wrapperClassName="col-span-2" value={titulo} onChange={(e) => setTitulo(e.target.value)} error={errores.titulo} placeholder="Ej. Plantas de distribución – 1er nivel" />
        {esAdmin && (
          <Select label="Responsable" wrapperClassName="col-span-2" value={responsableId} onChange={(e) => setResponsableId(e.target.value)} hint="Si lo dejas vacío, quedas tú como responsable">
            <option value="">Yo</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </Select>
        )}
        <div className="col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Archivo <span className="font-normal text-slate-400">(opcional)</span>
          </p>
          <SelectorArchivo archivo={archivo} onChange={setArchivo} />
        </div>
        {archivo && <Input label="Comentario de la revisión" wrapperClassName="col-span-2" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Opcional" />}
      </div>
    </Modal>
  );
}

function SubirVersionModal({ proyectoId, plano, onClose }: { proyectoId: number; plano: Plano | null; onClose: () => void }) {
  const subir = useSubirVersion(proyectoId);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    setArchivo(null);
    setComentario('');
    setError(undefined);
  }, [plano]);

  if (!plano) return null;
  const siguiente = revisionLetra((plano.ultimaVersion?.revision ?? 0) + 1);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Subir Rev. ${siguiente} – ${plano.codigo}`}
      description={plano.titulo}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            icon={<Upload className="size-4" />}
            loading={subir.isPending}
            onClick={async () => {
              if (!archivo) return setError('Adjunta el archivo de la nueva revisión');
              await subir.mutateAsync({ planoId: plano.id, archivo, comentario: comentario.trim() || undefined });
              onClose();
            }}
          >
            Subir y enviar a revisión
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {plano.estado === 'OBSERVADO' && plano.observacion && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <p className="font-medium">Observación a levantar:</p>
            <p>{plano.observacion}</p>
          </div>
        )}
        <SelectorArchivo archivo={archivo} onChange={setArchivo} error={error} />
        <Textarea label="¿Qué cambió en esta revisión?" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej. Se levantó la observación del corte B-B" />
      </div>
    </Modal>
  );
}

function HistorialModal({ planoId, onClose }: { planoId: number | null; onClose: () => void }) {
  const { data, isLoading, error } = usePlano(planoId);
  return (
    <Modal open={!!planoId} onClose={onClose} title={data ? `${data.codigo} · Historial de revisiones` : 'Historial'} description={data?.titulo} size="lg">
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data?.versiones.length ? (
        <EmptyState title="Sin revisiones" />
      ) : (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
          {data.versiones.map((v, i) => (
            <li key={v.id} className="relative">
              <span className={clsx('absolute -left-[27px] top-1 flex size-3 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand-500' : 'bg-slate-300')} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">
                    Rev. {revisionLetra(v.revision)} {i === 0 && <Badge color="amber">Vigente</Badge>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {v.usuario.nombre} · {formatFechaHora(v.fecha)} · {v.nombreArchivo} ({formatBytes(v.tamano)})
                  </p>
                  {v.comentario && <p className="mt-1 text-sm text-slate-600">{v.comentario}</p>}
                </div>
                <div className="flex gap-1">
                  {visible(v.nombreArchivo) && (
                    <Button size="sm" variant="secondary" icon={<Eye className="size-4" />} onClick={() => abrirVersion(v, true)}>
                      Ver
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => abrirVersion(v)}>
                    Descargar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

function RevisarModal({ proyectoId, state, onClose }: { proyectoId: number; state: { plano: Plano; accion: 'APROBADO' | 'OBSERVADO' } | null; onClose: () => void }) {
  const actualizar = useActualizarPlano(proyectoId);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | undefined>();
  useEffect(() => {
    setObservacion('');
    setError(undefined);
  }, [state]);
  if (!state) return null;
  const { plano, accion } = state;
  const aprobar = accion === 'APROBADO';
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={aprobar ? `Aprobar ${plano.codigo}` : `Observar ${plano.codigo}`}
      description={`${plano.titulo} · Rev. ${revisionLetra(plano.ultimaVersion?.revision ?? 1)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant={aprobar ? 'primary' : 'danger'}
            loading={actualizar.isPending}
            onClick={async () => {
              if (!aprobar && observacion.trim().length < 3) return setError('Describe qué se debe corregir');
              await actualizar.mutateAsync({ id: plano.id, estado: accion, ...(aprobar ? {} : { observacion: observacion.trim() }) });
              onClose();
            }}
          >
            {aprobar ? 'Aprobar plano' : 'Enviar observación'}
          </Button>
        </>
      }
    >
      {aprobar ? (
        <p className="text-sm text-slate-600">La revisión vigente quedará como aprobada. Si luego se sube una nueva revisión, el plano volverá a revisión.</p>
      ) : (
        <Textarea label="Observación" rows={4} value={observacion} onChange={(e) => setObservacion(e.target.value)} error={error} placeholder="Ej. Falta indicar el nivel de piso terminado en el corte B-B" />
      )}
    </Modal>
  );
}

function EditarPlanoModal({ proyectoId, plano, onClose }: { proyectoId: number; plano: Plano | null; onClose: () => void }) {
  const actualizar = useActualizarPlano(proyectoId);
  const { data: usuarios = [] } = useUsuarios({ activo: true }, !!plano);
  const [codigo, setCodigo] = useState('');
  const [titulo, setTitulo] = useState('');
  const [especialidad, setEspecialidad] = useState<Especialidad>('ARQUITECTURA');
  const [responsableId, setResponsableId] = useState('');
  const [estado, setEstado] = useState<EstadoRevision>('BORRADOR');

  useEffect(() => {
    if (!plano) return;
    setCodigo(plano.codigo);
    setTitulo(plano.titulo);
    setEspecialidad(plano.especialidad);
    setResponsableId(plano.responsableId ? String(plano.responsableId) : '');
    setEstado(plano.estado);
  }, [plano]);

  if (!plano) return null;
  return (
    <Modal
      open
      onClose={onClose}
      title={`Editar ${plano.codigo}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={actualizar.isPending}
            onClick={async () => {
              await actualizar.mutateAsync({
                id: plano.id,
                codigo: codigo.trim(),
                titulo: titulo.trim(),
                especialidad,
                responsableId: responsableId ? Number(responsableId) : null,
                ...(estado !== plano.estado && estado !== 'OBSERVADO' && { estado }),
              });
              onClose();
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Input label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
        <Select label="Especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value as Especialidad)}>
          {ESPECIALIDADES.map((e) => (
            <option key={e} value={e}>
              {ESPECIALIDAD[e].label}
            </option>
          ))}
        </Select>
        <Input label="Título" wrapperClassName="col-span-2" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <Select label="Responsable" value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
          <option value="">Sin asignar</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </Select>
        <Select label="Estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoRevision)} hint="Para observar usa el botón Observar">
          {ORDEN_REVISION.filter((e) => e !== 'OBSERVADO' || plano.estado === 'OBSERVADO').map((e) => (
            <option key={e} value={e}>
              {ESTADO_REVISION[e].label}
            </option>
          ))}
        </Select>
      </div>
    </Modal>
  );
}
