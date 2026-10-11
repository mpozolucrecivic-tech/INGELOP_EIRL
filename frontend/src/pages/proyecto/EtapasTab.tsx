import { useRef, useState, type ChangeEvent } from 'react';
import clsx from 'clsx';
import { CheckCircle2, Circle, Download, FileText, MessageSquareWarning, Plus, Send, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  descargarDocumento,
  useAccionEtapa,
  useDocumentosProyecto,
  useEliminarDocumento,
  useEliminarEtapa,
  useEtapas,
  useIniciarEtapa,
  useSubirDocumento,
} from '@/api/documentos';
import { mensajeError } from '@/api/client';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import {
  CATEGORIA_DOCUMENTO,
  ESTADO_ETAPA,
  FORMATOS_DOCUMENTO,
  formatBytes,
  formatFecha,
  formatFechaHora,
  ORDEN_ETAPAS,
  TIPO_ETAPA,
} from '@/lib/format';
import type { CategoriaDocumento, Documento, Etapa, TipoEtapa } from '@/types/api';

const MAX_MB = 50;

export default function EtapasTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const { data: etapas, isLoading, error, refetch } = useEtapas(proyectoId);
  const { data: documentos } = useDocumentosProyecto(proyectoId);
  const [iniciar, setIniciar] = useState(false);

  if (isLoading) return <Spinner />;
  if (error || !etapas) return <ErrorState error={error} onRetry={refetch} />;

  const porTipo = new Map(etapas.map((e) => [e.tipo, e]));
  const ultima = etapas[etapas.length - 1];
  // Etapas que se pueden iniciar: posteriores a la última, y solo si la última está aprobada
  const disponibles = ORDEN_ETAPAS.filter((t) => !ultima || ORDEN_ETAPAS.indexOf(t) > ORDEN_ETAPAS.indexOf(ultima.tipo));
  const puedeIniciar = disponibles.length > 0 && (!ultima || ultima.estado === 'APROBADO');

  return (
    <>
      <TextoAyuda>
        El proyecto avanza por etapas. Cada etapa se elabora, se envía a revisión y la jefatura la <b>aprueba</b> u <b>observa</b> con un
        comentario. Para iniciar la siguiente, la anterior debe estar aprobada.
        {!esAdmin && ' Solo ves los documentos que tú subiste.'}
      </TextoAyuda>

      {/* Línea de tiempo */}
      <Card className="mb-6 p-4">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ORDEN_ETAPAS.map((t, i) => {
            const e = porTipo.get(t);
            return (
              <li key={t} className="flex items-start gap-2">
                {e?.estado === 'APROBADO' ? (
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className={clsx('mt-0.5 size-5 shrink-0', e ? 'text-brand-500' : 'text-slate-300')} />
                )}
                <div>
                  <p className={clsx('text-sm font-medium', e ? 'text-slate-900' : 'text-slate-400')}>
                    {i + 1}. {TIPO_ETAPA[t]}
                  </p>
                  {e ? <Badge color={ESTADO_ETAPA[e.estado].color}>{ESTADO_ETAPA[e.estado].label}</Badge> : <span className="text-xs text-slate-400">No iniciada</span>}
                </div>
              </li>
            );
          })}
        </ol>
        {esAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <Button icon={<Plus className="size-4" />} disabled={!puedeIniciar} onClick={() => setIniciar(true)}>
              {ultima ? 'Iniciar siguiente etapa' : 'Iniciar primera etapa'}
            </Button>
            {!puedeIniciar && disponibles.length > 0 && ultima && (
              <span className="text-sm text-slate-500">Para continuar, primero aprueba la etapa de {TIPO_ETAPA[ultima.tipo].toLowerCase()}.</span>
            )}
            {disponibles.length === 0 && <span className="text-sm text-slate-500">El proyecto ya llegó a la última etapa.</span>}
          </div>
        )}
      </Card>

      {etapas.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="size-6" />}
            title="Aún no hay etapas"
            description={esAdmin ? 'Inicia la primera etapa del proyecto para empezar a cargar sus documentos.' : 'La jefatura todavía no inició ninguna etapa.'}
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {[...etapas].reverse().map((e) => (
            <EtapaCard key={e.id} etapa={e} proyectoId={proyectoId} esUltima={e.id === ultima?.id} documentos={(documentos ?? []).filter((d) => d.etapaId === e.id)} />
          ))}
        </div>
      )}

      <IniciarEtapaModal open={iniciar} onClose={() => setIniciar(false)} proyectoId={proyectoId} opciones={disponibles} />
    </>
  );
}

function EtapaCard({ etapa, proyectoId, esUltima, documentos }: { etapa: Etapa; proyectoId: number; esUltima: boolean; documentos: Documento[] }) {
  const { esAdmin } = useAuth();
  const accion = useAccionEtapa(proyectoId);
  const eliminarEtapa = useEliminarEtapa(proyectoId);
  const eliminarDoc = useEliminarDocumento();
  const { confirm, dialog } = useConfirm();
  const [observar, setObservar] = useState(false);
  const [subir, setSubir] = useState(false);
  const aprobada = etapa.estado === 'APROBADO';
  const puedeEnviar = etapa.estado === 'EN_ELABORACION' || etapa.estado === 'OBSERVADO';

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{TIPO_ETAPA[etapa.tipo]}</h2>
            <Badge color={ESTADO_ETAPA[etapa.estado].color}>{ESTADO_ETAPA[etapa.estado].label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Inicio: {formatFecha(etapa.fechaInicio)}
            {etapa.fechaFin && ` · Fin previsto: ${formatFecha(etapa.fechaFin)}`}
            {etapa.fechaAprobacion && ` · Aprobada el ${formatFechaHora(etapa.fechaAprobacion)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {puedeEnviar && (
            <Button size="sm" variant="secondary" icon={<Send className="size-4" />} loading={accion.isPending} onClick={() => accion.mutate({ id: etapa.id, accion: 'enviar' })}>
              {etapa.estado === 'OBSERVADO' ? 'Reenviar a revisión' : 'Enviar a revisión'}
            </Button>
          )}
          {esAdmin && !aprobada && (
            <Button
              size="sm"
              icon={<CheckCircle2 className="size-4" />}
              onClick={() =>
                confirm({
                  title: `Aprobar ${TIPO_ETAPA[etapa.tipo].toLowerCase()}`,
                  message: 'Al aprobarla, la etapa ya no admitirá documentos nuevos y se podrá iniciar la siguiente.',
                  confirmText: 'Aprobar',
                  onConfirm: () => accion.mutateAsync({ id: etapa.id, accion: 'aprobar' }),
                })
              }
            >
              Aprobar
            </Button>
          )}
          {esAdmin && (!aprobada || esUltima) && (
            <Button size="sm" variant="secondary" icon={<MessageSquareWarning className="size-4" />} onClick={() => setObservar(true)}>
              Observar
            </Button>
          )}
          {esAdmin && esUltima && documentos.length === 0 && (
            <IconButton
              label="Eliminar etapa"
              className="hover:text-red-600"
              onClick={() =>
                confirm({
                  title: 'Eliminar etapa',
                  message: 'Úsalo solo si la iniciaste por error. La etapa no tiene documentos.',
                  onConfirm: () => eliminarEtapa.mutateAsync(etapa.id),
                })
              }
            >
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </div>
      </div>

      {etapa.estado === 'OBSERVADO' && etapa.observacion && (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Observación de {etapa.observadoPor?.nombre ?? 'la jefatura'}{etapa.observadoEn && ` · ${formatFechaHora(etapa.observadoEn)}`}</p>
          <p className="mt-1 whitespace-pre-wrap">{etapa.observacion}</p>
          <p className="mt-2 text-xs">Corrige lo indicado y pulsa «Reenviar a revisión».</p>
        </div>
      )}

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Documentos ({documentos.length})</h3>
          {!aprobada && (
            <Button size="sm" variant="secondary" icon={<Upload className="size-4" />} onClick={() => setSubir(true)}>
              Subir documento
            </Button>
          )}
        </div>
        {documentos.length === 0 ? (
          <p className="text-sm text-slate-500">{aprobada ? 'Sin documentos.' : 'Aún no hay documentos en esta etapa.'}</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {documentos.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
                <FileText className="size-5 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{d.nombreArchivo}</p>
                  <p className="text-xs text-slate-500">
                    {CATEGORIA_DOCUMENTO[d.categoria]} · {formatBytes(d.tamano)} · {d.usuario.nombre} · {formatFechaHora(d.fecha)}
                    {d.descripcion && ` · ${d.descripcion}`}
                  </p>
                </div>
                <IconButton label="Descargar" onClick={() => descargarDocumento(d).catch((e) => toast.error(mensajeError(e)))}>
                  <Download className="size-4" />
                </IconButton>
                {esAdmin && (
                  <IconButton
                    label="Eliminar documento"
                    className="hover:text-red-600"
                    onClick={() => confirm({ title: 'Eliminar documento', message: `¿Eliminar «${d.nombreArchivo}»? No se puede deshacer.`, onConfirm: () => eliminarDoc.mutateAsync(d.id) })}
                  >
                    <Trash2 className="size-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ObservarModal open={observar} onClose={() => setObservar(false)} onEnviar={(observacion) => accion.mutateAsync({ id: etapa.id, accion: 'observar', observacion })} />
      <SubirDocumentoModal open={subir} onClose={() => setSubir(false)} proyectoId={proyectoId} etapa={etapa} />
      {dialog}
    </Card>
  );
}

function IniciarEtapaModal({ open, onClose, proyectoId, opciones }: { open: boolean; onClose: () => void; proyectoId: number; opciones: TipoEtapa[] }) {
  const iniciar = useIniciarEtapa(proyectoId);
  const [tipo, setTipo] = useState<TipoEtapa | ''>('');
  const [fechaFin, setFechaFin] = useState('');
  const elegido = tipo || opciones[0];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Iniciar etapa"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={iniciar.isPending}
            disabled={!elegido}
            onClick={async () => {
              await iniciar.mutateAsync({ tipo: elegido, ...(fechaFin && { fechaFin }) });
              setTipo('');
              setFechaFin('');
              onClose();
            }}
          >
            Iniciar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Etapa" value={elegido ?? ''} onChange={(e) => setTipo(e.target.value as TipoEtapa)}>
          {opciones.map((t) => (
            <option key={t} value={t}>
              {TIPO_ETAPA[t]}
            </option>
          ))}
        </Select>
        <Input label="Fecha prevista de término" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} hint="Opcional" />
      </div>
    </Modal>
  );
}

function ObservarModal({ open, onClose, onEnviar }: { open: boolean; onClose: () => void; onEnviar: (observacion: string) => Promise<unknown> }) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const valido = texto.trim().length >= 5;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Observar etapa"
      description="El responsable verá este comentario, corregirá y volverá a enviar la etapa a revisión."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            disabled={!valido}
            loading={enviando}
            onClick={async () => {
              setEnviando(true);
              try {
                await onEnviar(texto.trim());
                setTexto('');
                onClose();
              } finally {
                setEnviando(false);
              }
            }}
          >
            Enviar observación
          </Button>
        </>
      }
    >
      <Textarea label="¿Qué hay que corregir?" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej. Falta el plano de cortes y el metrado de acero." />
    </Modal>
  );
}

function SubirDocumentoModal({ open, onClose, proyectoId, etapa }: { open: boolean; onClose: () => void; proyectoId: number; etapa: Etapa }) {
  const subir = useSubirDocumento(proyectoId);
  const ref = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [categoria, setCategoria] = useState<CategoriaDocumento>('MEMORIA');
  const [descripcion, setDescripcion] = useState('');

  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) return void toast.error(`El archivo supera el máximo de ${MAX_MB} MB`);
    setArchivo(f);
  };
  const cerrar = () => {
    setArchivo(null);
    setDescripcion('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={cerrar}
      title={`Subir documento · ${TIPO_ETAPA[etapa.tipo]}`}
      footer={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={!archivo}
            loading={subir.isPending}
            onClick={async () => {
              if (!archivo) return;
              await subir.mutateAsync({ etapaId: etapa.id, categoria, descripcion: descripcion.trim() || undefined, archivo });
              cerrar();
            }}
          >
            Subir
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDocumento)}>
          {(Object.keys(CATEGORIA_DOCUMENTO) as CategoriaDocumento[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_DOCUMENTO[c]}
            </option>
          ))}
        </Select>
        <Input label="Descripción" value={descripcion} maxLength={500} onChange={(e) => setDescripcion(e.target.value)} hint="Opcional" />
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">
            Archivo <span className="font-normal text-slate-400">(PDF, Word, Excel, imagen, DWG, DXF o ZIP · máx. {MAX_MB} MB)</span>
          </p>
          <input ref={ref} type="file" accept={FORMATOS_DOCUMENTO} onChange={elegir} className="hidden" />
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <FileText className="size-8 shrink-0 text-slate-400" />
            <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{archivo ? `${archivo.name} · ${formatBytes(archivo.size)}` : 'Ningún archivo elegido'}</p>
            <Button size="sm" variant="secondary" onClick={() => ref.current?.click()}>
              Elegir archivo
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
