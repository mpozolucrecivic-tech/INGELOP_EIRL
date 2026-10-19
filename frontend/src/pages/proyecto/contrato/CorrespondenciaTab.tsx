import { useDeferredValue, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Mail, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { mensajeError } from '@/api/client';
import { useActualizarCorrespondencia, useCorrespondencia, useCrearCorrespondencia, useEliminarCorrespondencia, useSiguienteNumeroCarta } from '@/api/contrato';
import { descargarDocumento } from '@/api/documentos';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { aInputFecha, formatBytes, formatFecha, FORMATOS_DOCUMENTO, hoyInput, TIPO_CORRESPONDENCIA } from '@/lib/format';
import type { Correspondencia, TipoCorrespondencia } from '@/types/api';
import { toast } from 'sonner';

export default function CorrespondenciaTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const [tipo, setTipo] = useState<TipoCorrespondencia | ''>('');
  const [q, setQ] = useState('');
  const busqueda = useDeferredValue(q.trim());
  const { data, isLoading, error, refetch } = useCorrespondencia(proyectoId, { ...(tipo && { tipo }), ...(busqueda && { q: busqueda }) });
  const eliminar = useEliminarCorrespondencia(proyectoId);
  const { confirm, dialog } = useConfirm();
  const [modal, setModal] = useState<{ carta?: Correspondencia } | null>(null);

  const descargar = (c: Correspondencia) =>
    descargarDocumento({ descargaUrl: c.descargaUrl!, nombreArchivo: c.nombreArchivo ?? 'documento' }).catch((e) => toast.error(mensajeError(e)));

  return (
    <div className="space-y-6">
      <TextoAyuda>Cartas, oficios e informes enviados a la entidad o recibidos de ella, con su archivo. Sirven de sustento ante observaciones, ampliaciones o penalidades.</TextoAyuda>
      <Card>
        <CardHeader
          title="Correspondencia"
          action={
            esAdmin && (
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({})}>
                Documento
              </Button>
            )
          }
        />
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Buscar por número, asunto o entidad…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar correspondencia" />
          </div>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoCorrespondencia | '')} aria-label="Tipo">
            <option value="">Enviadas y recibidas</option>
            <option value="ENVIADA">Solo enviadas</option>
            <option value="RECIBIDA">Solo recibidas</option>
          </Select>
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <EmptyState icon={<Mail className="size-6" />} title={busqueda || tipo ? 'Sin resultados' : 'Sin correspondencia'} description={busqueda || tipo ? undefined : 'Registra las cartas enviadas y los oficios recibidos del cliente.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Documento</th>
                <th className={th}>Asunto</th>
                <th className={th}>Archivo</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(c.fecha)}</td>
                  <td className={td}>
                    <Badge color={TIPO_CORRESPONDENCIA[c.tipo].color}>{TIPO_CORRESPONDENCIA[c.tipo].label}</Badge>
                    <p className="mt-1 font-medium text-slate-900">{c.numero}</p>
                    <p className="text-xs text-slate-500">
                      {c.tipo === 'ENVIADA' ? 'Para' : 'De'}: {c.entidad}
                    </p>
                  </td>
                  <td className={td}>
                    <p className="text-slate-800">{c.asunto}</p>
                    {c.referencia && <p className="text-xs text-slate-500">Ref.: {c.referencia}</p>}
                    {c.respondeA && <p className="text-xs text-slate-500">Responde a {c.respondeA.numero}</p>}
                    {c.respuestas.length > 0 && <p className="text-xs text-emerald-700">Respondida con {c.respuestas.map((r) => r.numero).join(', ')}</p>}
                  </td>
                  <td className={td}>
                    {c.tieneArchivo ? (
                      <button onClick={() => descargar(c)} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                        <Download className="size-3.5" />
                        {c.tamano ? formatBytes(c.tamano) : 'Descargar'}
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={td}>
                    {esAdmin && (
                      <div className="flex justify-end">
                        <IconButton label="Editar" onClick={() => setModal({ carta: c })}>
                          <Pencil className="size-4" />
                        </IconButton>
                        <IconButton
                          label="Eliminar"
                          className="hover:text-red-600"
                          onClick={() => confirm({ title: 'Eliminar documento', message: `¿Eliminar «${c.numero}»${c.tieneArchivo ? ' y su archivo' : ''}?`, onConfirm: () => eliminar.mutateAsync(c.id) })}
                        >
                          <Trash2 className="size-4" />
                        </IconButton>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {esAdmin && <CorrespondenciaModal proyectoId={proyectoId} state={modal} onClose={() => setModal(null)} otras={data ?? []} />}
      {dialog}
    </div>
  );
}

const schema = z.object({
  tipo: z.enum(['ENVIADA', 'RECIBIDA']),
  numero: z.string().trim().min(1, 'Indica el número').max(120),
  fecha: z.string().min(1, 'Requerido'),
  asunto: z.string().trim().min(3, 'Indica el asunto').max(300),
  entidad: z.string().trim().min(2, 'Requerido').max(200),
  referencia: z.string().max(300),
  respondeAId: z.string(),
});
type FormData = z.infer<typeof schema>;

function CorrespondenciaModal({ proyectoId, state, onClose, otras }: { proyectoId: number; state: { carta?: Correspondencia } | null; onClose: () => void; otras: Correspondencia[] }) {
  const carta = state?.carta;
  const crear = useCrearCorrespondencia(proyectoId);
  const actualizar = useActualizarCorrespondencia(proyectoId);
  const [archivo, setArchivo] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });
  const tipo = watch('tipo');
  const sugerido = useSiguienteNumeroCarta(!!state && !carta && tipo === 'ENVIADA');

  useEffect(() => {
    if (!state) return;
    setArchivo(null);
    reset({
      tipo: carta?.tipo ?? 'RECIBIDA',
      numero: carta?.numero ?? '',
      fecha: aInputFecha(carta?.fecha) || hoyInput(),
      asunto: carta?.asunto ?? '',
      entidad: carta?.entidad ?? '',
      referencia: carta?.referencia ?? '',
      respondeAId: carta?.respondeA ? String(carta.respondeA.id) : '',
    });
  }, [state, carta, reset]);

  const onSubmit = async (f: FormData) => {
    const data = { ...f, referencia: f.referencia.trim() || null, respondeAId: f.respondeAId ? Number(f.respondeAId) : null };
    if (carta) await actualizar.mutateAsync({ id: carta.id, ...data });
    else await crear.mutateAsync({ ...data, archivo });
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={carta ? 'Editar documento' : 'Registrar carta u oficio'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="correspondencia-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="correspondencia-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Select label="Tipo" error={errors.tipo?.message} {...register('tipo')}>
          <option value="RECIBIDA">Recibida (de la entidad)</option>
          <option value="ENVIADA">Enviada (por INGELOP)</option>
        </Select>
        <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
        <Input
          label="Número"
          wrapperClassName="sm:col-span-2"
          placeholder={tipo === 'ENVIADA' ? `Carta N.° ${sugerido.data ?? '001-2026'}-INGELOP` : 'Oficio N.° 123-2026-MDLV/GDU'}
          hint={tipo === 'ENVIADA' && sugerido.data ? `Siguiente correlativo del año: ${sugerido.data}` : undefined}
          error={errors.numero?.message}
          {...register('numero')}
        />
        <Input label="Asunto" wrapperClassName="sm:col-span-2" error={errors.asunto?.message} {...register('asunto')} />
        <Input label={tipo === 'ENVIADA' ? 'Dirigida a' : 'Remitida por'} placeholder="Ej. Municipalidad Distrital de La Victoria" error={errors.entidad?.message} {...register('entidad')} />
        <Input label="Referencia" hint="Opcional" error={errors.referencia?.message} {...register('referencia')} />
        <Select label="Responde a" wrapperClassName="sm:col-span-2" error={errors.respondeAId?.message} {...register('respondeAId')}>
          <option value="">—</option>
          {otras
            .filter((o) => o.id !== carta?.id)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero} · {o.asunto}
              </option>
            ))}
        </Select>
        {!carta && (
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-600 hover:border-slate-400 sm:col-span-2">
            <Paperclip className="size-4 shrink-0" />
            <span className="truncate">{archivo ? `${archivo.name} (${formatBytes(archivo.size)})` : 'Adjuntar el documento escaneado (PDF, Word, imagen…) — opcional'}</span>
            <input type="file" accept={FORMATOS_DOCUMENTO} className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </form>
    </Modal>
  );
}
