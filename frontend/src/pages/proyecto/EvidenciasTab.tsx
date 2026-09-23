import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { Camera, Download, ExternalLink, FileText, MessageSquareText, Trash2, Upload, X } from 'lucide-react';
import { useActividades, useSprints } from '@/api/proyectos';
import { useCrearEvidencia, useEliminarEvidencia, useEvidencias } from '@/api/recursos';
import { obtenerArchivo } from '@/api/client';
import { abrirArchivo, AuthImage } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { formatFechaHora, TIPO_EVIDENCIA } from '@/lib/format';
import type { Evidencia, TipoEvidencia } from '@/types/api';

const TIPOS = Object.keys(TIPO_EVIDENCIA) as TipoEvidencia[];
const MAX_MB = 20;
const ACCEPT: Record<TipoEvidencia, string> = {
  FOTO: 'image/jpeg,image/png,image/webp,image/gif,image/heic',
  INFORME: '.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*',
  DOCUMENTO: '.pdf,.doc,.docx,.xls,.xlsx,.txt,image/*',
  OBSERVACION: 'image/*,.pdf',
};

const esImagen = (e: Evidencia) => !!e.archivoUrl && /\.(jpe?g|png|webp|gif)$/i.test(e.archivoUrl);

export default function EvidenciasTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const [tipo, setTipo] = useState<TipoEvidencia | ''>('');
  const [subiendo, setSubiendo] = useState(false);
  const [viendo, setViendo] = useState<Evidencia | null>(null);
  const { data: evidencias, isLoading, error, refetch } = useEvidencias(proyectoId, tipo ? { tipo } : {});
  const eliminar = useEliminarEvidencia(proyectoId);
  const { confirm, dialog } = useConfirm();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(['', ...TIPOS] as const).map((t) => (
            <button
              key={t || 'todos'}
              onClick={() => setTipo(t)}
              className={clsx(
                'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                tipo === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {t ? TIPO_EVIDENCIA[t] : 'Todas'}
            </button>
          ))}
        </div>
        <Button icon={<Upload className="size-4" />} onClick={() => setSubiendo(true)}>
          Subir documento
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !evidencias?.length ? (
        <Card>
          <EmptyState
            icon={<Camera className="size-6" />}
            title="Sin documentos"
            description="Sube actas, informes, fotos de visitas de campo u observaciones del proyecto."
            action={<Button variant="secondary" onClick={() => setSubiendo(true)}>Subir la primera</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {evidencias.map((e) => (
            <Card key={e.id} className="flex flex-col overflow-hidden">
              {e.archivoUrl ? (
                <button
                  type="button"
                  onClick={() => (esImagen(e) ? setViendo(e) : e.descargaUrl && abrirArchivo(e.descargaUrl))}
                  className="group relative aspect-[4/3] w-full bg-slate-100"
                  aria-label={`Ver ${e.titulo}`}
                >
                  {esImagen(e) && e.descargaUrl ? (
                    <AuthImage url={e.descargaUrl} alt={e.titulo} className="size-full object-cover transition-opacity group-hover:opacity-90" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="size-10" />
                      <span className="text-xs font-medium uppercase">{e.archivoUrl.split('.').pop()}</span>
                    </div>
                  )}
                  <Badge color="blue" className="absolute left-2 top-2 shadow-sm">
                    {TIPO_EVIDENCIA[e.tipo]}
                  </Badge>
                </button>
              ) : (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <MessageSquareText className="size-4 text-slate-400" />
                  <Badge color="blue">{TIPO_EVIDENCIA[e.tipo]}</Badge>
                </div>
              )}
              <div className="flex flex-1 flex-col p-3">
                <p className="font-medium leading-snug text-slate-900">{e.titulo}</p>
                {e.descripcion && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{e.descripcion}</p>}
                {e.actividad && <p className="mt-2 text-xs text-slate-500">Actividad: {e.actividad.nombre}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-slate-500">
                  <span className="truncate">
                    {e.usuario.nombre} · {formatFechaHora(e.fecha)}
                  </span>
                  <div className="flex shrink-0">
                    {e.descargaUrl && (
                      <IconButton label="Descargar" className="size-7" onClick={() => descargar(e)}>
                        <Download className="size-3.5" />
                      </IconButton>
                    )}
                    {esAdmin && (
                      <IconButton
                        label="Eliminar evidencia"
                        className="size-7 hover:text-red-600"
                        onClick={() =>
                          confirm({
                            title: 'Eliminar evidencia',
                            message: `¿Eliminar "${e.titulo}" y su archivo? Esta acción no se puede deshacer.`,
                            onConfirm: () => eliminar.mutateAsync(e.id),
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SubirModal proyectoId={proyectoId} open={subiendo} onClose={() => setSubiendo(false)} />
      <Modal open={!!viendo} onClose={() => setViendo(null)} title={viendo?.titulo ?? ''} description={viendo?.descripcion ?? undefined} size="lg">
        {viendo?.descargaUrl && (
          <div className="space-y-3">
            <AuthImage url={viendo.descargaUrl} alt={viendo.titulo} className="max-h-[65vh] w-full rounded-lg object-contain" />
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" icon={<ExternalLink className="size-4" />} onClick={() => abrirArchivo(viendo.descargaUrl!)}>
                Abrir en pestaña nueva
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {dialog}
    </>
  );
}

async function descargar(e: Evidencia) {
  if (!e.descargaUrl) return;
  const url = await obtenerArchivo(`${e.descargaUrl}?descargar=true`);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${e.titulo}.${e.archivoUrl?.split('.').pop() ?? ''}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SubirModal({ proyectoId, open, onClose }: { proyectoId: number; open: boolean; onClose: () => void }) {
  const crear = useCrearEvidencia(proyectoId);
  const { data: sprints = [] } = useSprints(proyectoId);
  const [tipo, setTipo] = useState<TipoEvidencia>('FOTO');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [actividadId, setActividadId] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: actividades = [] } = useActividades(sprintId);

  useEffect(() => {
    if (!open) return;
    setTipo('FOTO');
    setTitulo('');
    setDescripcion('');
    setActividadId('');
    setArchivo(null);
    setErrores({});
    setSprintId(sprints.find((s) => s.vigente)?.id ?? sprints[sprints.length - 1]?.id ?? null);
  }, [open]);

  useEffect(() => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(archivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setErrores((x) => ({ ...x, archivo: `El archivo supera ${MAX_MB} MB` }));
      return;
    }
    setErrores((x) => ({ ...x, archivo: '' }));
    setArchivo(f);
    if (f && !titulo) setTitulo(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const enviar = async () => {
    const errs: Record<string, string> = {};
    if (titulo.trim().length < 3) errs.titulo = 'Mínimo 3 caracteres';
    if (tipo !== 'OBSERVACION' && !archivo) errs.archivo = 'Adjunta un archivo';
    if (tipo === 'FOTO' && archivo && !archivo.type.startsWith('image/')) errs.archivo = 'Una foto debe ser una imagen';
    setErrores(errs);
    if (Object.values(errs).some(Boolean)) return;

    await crear.mutateAsync({
      tipo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || undefined,
      actividadId: actividadId ? Number(actividadId) : undefined,
      archivo,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subir documento"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<Upload className="size-4" />} onClick={enviar} loading={crear.isPending}>
            Subir
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Tipo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={clsx(
                  'rounded-lg border px-2 py-2 text-sm font-medium transition-colors',
                  tipo === t ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                {TIPO_EVIDENCIA[t]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Archivo {tipo === 'OBSERVACION' && <span className="font-normal text-slate-400">(opcional)</span>}</p>
          <input ref={inputRef} type="file" accept={ACCEPT[tipo]} onChange={onFile} className="hidden" />
          {archivo ? (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-2">
              {preview ? <img src={preview} alt="" className="size-14 rounded object-cover" /> : <FileText className="size-10 text-slate-400" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{archivo.name}</p>
                <p className="text-xs text-slate-500">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <IconButton label="Quitar archivo" onClick={() => setArchivo(null)}>
                <X className="size-4" />
              </IconButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={clsx(
                'flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors hover:border-brand-400 hover:bg-brand-50/50',
                errores.archivo ? 'border-red-300' : 'border-slate-300',
              )}
            >
              {tipo === 'FOTO' ? <Camera className="size-6 text-slate-400" /> : <Upload className="size-6 text-slate-400" />}
              <span className="font-medium text-slate-700">{tipo === 'FOTO' ? 'Tomar o elegir foto' : 'Elegir archivo'}</span>
              <span className="text-xs text-slate-500">Máximo {MAX_MB} MB</span>
            </button>
          )}
          {errores.archivo && <p className="mt-1 text-xs text-red-600">{errores.archivo}</p>}
        </div>

        <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} error={errores.titulo} placeholder="Ej. Avance de muros eje C" />
        <Textarea label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Opcional" />

        {sprints.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Sprint"
              value={sprintId ?? ''}
              onChange={(e) => {
                setSprintId(e.target.value ? Number(e.target.value) : null);
                setActividadId('');
              }}
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  Sprint {s.numero}
                </option>
              ))}
            </Select>
            <Select label="Actividad (opcional)" value={actividadId} onChange={(e) => setActividadId(e.target.value)}>
              <option value="">Ninguna</option>
              {actividades.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
    </Modal>
  );
}
