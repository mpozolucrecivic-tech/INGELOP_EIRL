import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Calculator, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useCrearAmpliacion, useEliminarAmpliacion, usePlazo, useResolverAmpliacion } from '@/api/contrato';
import { useProyecto } from '@/api/proyectos';
import { TextoAyuda } from '@/components/Common';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { ESTADO_AMPLIACION, formatFecha, formatNumero, formatSoles, hoyInput } from '@/lib/format';
import type { AmpliacionPlazo } from '@/types/api';

export default function PlazoTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  const { data, isLoading, error, refetch } = usePlazo(proyectoId);
  const eliminar = useEliminarAmpliacion(proyectoId);
  const { confirm, dialog } = useConfirm();
  const [solicitando, setSolicitando] = useState(false);
  const [resolviendo, setResolviendo] = useState<AmpliacionPlazo | null>(null);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  const p = data.plazo;

  return (
    <div className="space-y-6">
      <TextoAyuda>
        El plazo del contrato y sus ampliaciones. Al <b>aprobar</b> una ampliación, la fecha de término del proyecto se corre los días aprobados; si se elimina, vuelve atrás.
      </TextoAyuda>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Plazo original" value={`${formatNumero(p.plazoOriginalDias)} días`} hint={`${formatFecha(p.fechaInicio)} → ${formatFecha(p.fechaFinOriginal)}`} />
        <StatCard
          label="Plazo vigente"
          value={`${formatNumero(p.plazoVigenteDias)} días`}
          hint={p.diasAmpliados ? `+${p.diasAmpliados} días ampliados · termina el ${formatFecha(p.fechaFin)}` : `Termina el ${formatFecha(p.fechaFin)}`}
        />
        <StatCard
          label={p.diasRestantes < 0 ? 'Días de atraso' : 'Días restantes'}
          value={formatNumero(Math.abs(p.diasRestantes))}
          tone={p.diasRestantes < 0 ? 'danger' : p.diasRestantes <= 15 ? 'warning' : 'default'}
          hint={p.diasRestantes < 0 ? 'Pasó la fecha de término vigente' : 'Hasta la fecha de término vigente'}
        />
      </div>

      <Card>
        <CardHeader
          title="Ampliaciones de plazo"
          action={
            esAdmin && (
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setSolicitando(true)}>
                Solicitud
              </Button>
            )
          }
        />
        {!data.ampliaciones.length ? (
          <EmptyState icon={<CalendarClock className="size-6" />} title="Sin ampliaciones" description="Registra cada solicitud de ampliación de plazo y su resolución." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>N.°</th>
                <th className={th}>Motivo</th>
                <th className={th}>Solicitud</th>
                <th className={th}>Resolución</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {data.ampliaciones.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className={`${td} font-semibold`}>{a.numero}</td>
                  <td className={`${td} max-w-md`}>
                    <p className="line-clamp-2 text-slate-800">{a.motivo}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <p>{a.diasSolicitados} días</p>
                    <p className="text-xs text-slate-500">{formatFecha(a.fechaSolicitud)}</p>
                  </td>
                  <td className={td}>
                    <Badge color={ESTADO_AMPLIACION[a.estado].color}>{ESTADO_AMPLIACION[a.estado].label}</Badge>
                    {a.estado === 'APROBADA' && <p className="mt-1 text-xs font-medium text-emerald-700">{a.diasAprobados} días aprobados</p>}
                    {a.fechaResolucion && (
                      <p className="text-xs text-slate-500">
                        {formatFecha(a.fechaResolucion)}
                        {a.documentoResolucion && ` · ${a.documentoResolucion}`}
                      </p>
                    )}
                  </td>
                  <td className={td}>
                    {esAdmin && (
                      <div className="flex justify-end gap-1">
                        {a.estado === 'SOLICITADA' && (
                          <Button size="sm" variant="secondary" icon={<CheckCircle2 className="size-4" />} onClick={() => setResolviendo(a)}>
                            Resolver
                          </Button>
                        )}
                        <IconButton
                          label="Eliminar"
                          className="hover:text-red-600"
                          onClick={() =>
                            confirm({
                              title: 'Eliminar ampliación',
                              message:
                                a.estado === 'APROBADA'
                                  ? `¿Eliminar la ampliación N.° ${a.numero}? La fecha de término del proyecto volverá ${a.diasAprobados} días atrás.`
                                  : `¿Eliminar la ampliación N.° ${a.numero}?`,
                              onConfirm: () => eliminar.mutateAsync(a.id),
                            })
                          }
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

      {esAdmin && <CalculadoraPenalidad proyectoId={proyectoId} plazoDias={p.plazoVigenteDias} diasAtraso={Math.max(0, -p.diasRestantes)} />}

      {esAdmin && (
        <>
          <SolicitudModal proyectoId={proyectoId} open={solicitando} onClose={() => setSolicitando(false)} />
          <ResolverModal proyectoId={proyectoId} ampliacion={resolviendo} onClose={() => setResolviendo(null)} />
        </>
      )}
      {dialog}
    </div>
  );
}

/**
 * Penalidad por mora (Reglamento de la Ley 32069, D.S. 009-2025-EF, art. 120):
 * diaria = 0.10 × monto / (F × plazo en días), con tope del 10 % del monto vigente.
 * F se deja editable: 0.40 para plazos de hasta 60 días y 0.25 para plazos mayores en consultorías;
 * conviene confirmarlo con las bases del contrato.
 */
function CalculadoraPenalidad({ proyectoId, plazoDias, diasAtraso }: { proyectoId: number; plazoDias: number; diasAtraso: number }) {
  const { data: proyecto } = useProyecto(proyectoId);
  const [monto, setMonto] = useState('');
  const [plazo, setPlazo] = useState(String(plazoDias));
  const [atraso, setAtraso] = useState(String(diasAtraso));
  const [factor, setFactor] = useState('');

  useEffect(() => {
    if (proyecto) setMonto((m) => m || String(proyecto.montoContrato));
  }, [proyecto]);
  const plazoN = Number(plazo) || 0;
  const factorSugerido = plazoN > 60 ? 0.25 : 0.4;
  const F = Number(factor) || factorSugerido;
  const montoN = Number(monto) || 0;
  const diaria = plazoN > 0 && F > 0 ? (0.1 * montoN) / (F * plazoN) : 0;
  const tope = montoN * 0.1;
  const calculada = diaria * (Number(atraso) || 0);
  const total = Math.min(calculada, tope);

  return (
    <Card>
      <CardHeader title="Calculadora de penalidad por mora" subtitle="Para estimar cuánto podría descontar la entidad por cada día de atraso." />
      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Monto del contrato o ítem (S/)" type="number" min={0} step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} wrapperClassName="col-span-2" />
          <Input label="Plazo (días)" type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
          <Input label="Días de atraso" type="number" min={0} value={atraso} onChange={(e) => setAtraso(e.target.value)} />
          <Select label="Factor F" value={factor} onChange={(e) => setFactor(e.target.value)} wrapperClassName="col-span-2" hint="Confírmalo con las bases y el contrato">
            <option value="">Automático según el plazo ({factorSugerido.toFixed(2)})</option>
            <option value="0.4">0.40 · plazos de hasta 60 días</option>
            <option value="0.25">0.25 · plazos mayores a 60 días (consultorías, bienes y servicios)</option>
            <option value="0.15">0.15 · plazos mayores a 60 días (obras)</option>
          </Select>
        </div>
        <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Calculator className="size-4" />
            Resultado
          </p>
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-slate-700">
            <dt>Penalidad diaria</dt>
            <dd className="text-right tabular-nums">{formatSoles(diaria)}</dd>
            <dt>Por {formatNumero(Number(atraso) || 0)} días</dt>
            <dd className="text-right tabular-nums">{formatSoles(calculada)}</dd>
            <dt>Tope (10 % del monto)</dt>
            <dd className="text-right tabular-nums">{formatSoles(tope)}</dd>
            <dt className="border-t border-slate-200 pt-2 font-semibold text-slate-900">Penalidad aplicable</dt>
            <dd className={`border-t border-slate-200 pt-2 text-right font-semibold tabular-nums ${total > 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatSoles(total)}</dd>
          </dl>
          {calculada > tope && <p className="text-xs text-amber-700">Se alcanzó el tope: la entidad puede resolver el contrato por acumular la penalidad máxima.</p>}
          <p className="text-xs text-slate-500">
            Fórmula: 0.10 × monto ÷ (F × plazo). Referencia: art. 120 del Reglamento de la Ley 32069 (D.S. 009-2025-EF). Es una estimación; el monto final lo determina la entidad.
          </p>
        </div>
      </div>
    </Card>
  );
}

const schemaSolicitud = z.object({
  motivo: z.string().trim().min(5, 'Explica el motivo').max(2000),
  diasSolicitados: z.number({ invalid_type_error: 'Indica los días' }).int('Solo días enteros').min(1, 'Al menos 1 día'),
  fechaSolicitud: z.string().min(1, 'Requerido'),
});
type FormSolicitud = z.infer<typeof schemaSolicitud>;

function SolicitudModal({ proyectoId, open, onClose }: { proyectoId: number; open: boolean; onClose: () => void }) {
  const crear = useCrearAmpliacion(proyectoId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormSolicitud>({ resolver: zodResolver(schemaSolicitud) });
  useEffect(() => {
    if (open) reset({ motivo: '', diasSolicitados: undefined as unknown as number, fechaSolicitud: hoyInput() });
  }, [open, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Solicitud de ampliación de plazo"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="solicitud-form" loading={crear.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="solicitud-form" onSubmit={handleSubmit(async (f) => { await crear.mutateAsync(f); onClose(); })} className="grid grid-cols-2 gap-4" noValidate>
        <Textarea label="Motivo" wrapperClassName="col-span-2" rows={3} placeholder="Ej. La entidad demoró 20 días en entregar el estudio de suelos" error={errors.motivo?.message} {...register('motivo')} />
        <Input label="Días solicitados" type="number" min={1} error={errors.diasSolicitados?.message} {...register('diasSolicitados', { valueAsNumber: true })} />
        <Input label="Fecha de solicitud" type="date" error={errors.fechaSolicitud?.message} {...register('fechaSolicitud')} />
      </form>
    </Modal>
  );
}

const schemaResolver = z
  .object({
    estado: z.enum(['APROBADA', 'DENEGADA']),
    diasAprobados: z.number().int().min(1, 'Al menos 1 día').optional(),
    fechaResolucion: z.string().min(1, 'Requerido'),
    documentoResolucion: z.string().max(200),
  })
  .refine((d) => d.estado === 'DENEGADA' || (d.diasAprobados ?? 0) >= 1, { message: 'Indica los días aprobados', path: ['diasAprobados'] });
type FormResolver = z.infer<typeof schemaResolver>;

function ResolverModal({ proyectoId, ampliacion, onClose }: { proyectoId: number; ampliacion: AmpliacionPlazo | null; onClose: () => void }) {
  const resolver = useResolverAmpliacion(proyectoId);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormResolver>({ resolver: zodResolver(schemaResolver) });
  useEffect(() => {
    if (ampliacion) reset({ estado: 'APROBADA', diasAprobados: ampliacion.diasSolicitados, fechaResolucion: hoyInput(), documentoResolucion: '' });
  }, [ampliacion, reset]);
  const estado = watch('estado');

  const onSubmit = async (f: FormResolver) => {
    await resolver.mutateAsync({
      id: ampliacion!.id,
      estado: f.estado,
      ...(f.estado === 'APROBADA' && { diasAprobados: f.diasAprobados }),
      fechaResolucion: f.fechaResolucion,
      documentoResolucion: f.documentoResolucion.trim() || null,
    });
    onClose();
  };

  return (
    <Modal
      open={!!ampliacion}
      onClose={onClose}
      title={ampliacion ? `Resolver la ampliación N.° ${ampliacion.numero}` : ''}
      description={ampliacion ? `Se solicitaron ${ampliacion.diasSolicitados} días.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="resolver-form" loading={resolver.isPending}>
            Guardar resolución
          </Button>
        </>
      }
    >
      <form id="resolver-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Select label="Resultado" error={errors.estado?.message} {...register('estado')}>
          <option value="APROBADA">Aprobada</option>
          <option value="DENEGADA">Denegada</option>
        </Select>
        {estado === 'APROBADA' ? (
          <Input
            label="Días aprobados"
            type="number"
            min={1}
            hint="Se suman a la fecha de término"
            error={errors.diasAprobados?.message}
            {...register('diasAprobados', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
          />
        ) : (
          <div />
        )}
        <Input label="Fecha de resolución" type="date" error={errors.fechaResolucion?.message} {...register('fechaResolucion')} />
        <Input label="Documento" placeholder="Ej. Resolución N.° 045-2026" error={errors.documentoResolucion?.message} {...register('documentoResolucion')} />
      </form>
    </Modal>
  );
}
