import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { erroresDeCampo } from '@/api/client';
import { useActualizarCobro, useCrearCobro } from '@/api/cobros';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { aInputFecha, ESTADO_COBRO, formatSoles } from '@/lib/format';
import type { Cobro, EstadoCobro } from '@/types/api';

const dosDecimales = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
const importe = z.number({ invalid_type_error: 'Ingresa un monto' }).nonnegative('No puede ser negativo').refine(dosDecimales, 'Máximo 2 decimales');

const schema = z
  .object({
    concepto: z.string().trim().min(3, 'Mínimo 3 caracteres').max(200),
    monto: importe.refine((n) => n > 0, 'Debe ser mayor a 0'),
    detraccion: importe,
    penalidad: importe,
    estado: z.enum(['PROGRAMADO', 'FACTURADO', 'COBRADO', 'ANULADO']),
    fechaProgramada: z.string(),
    comprobante: z.string().trim().max(30),
    fechaEmision: z.string(),
    fechaCobro: z.string(),
    observacion: z.string().max(1000),
  })
  .superRefine((d, ctx) => {
    if (d.detraccion + d.penalidad > d.monto) ctx.addIssue({ code: 'custom', path: ['detraccion'], message: 'Con la penalidad supera el monto' });
    if (d.estado === 'FACTURADO' || d.estado === 'COBRADO') {
      if (!d.comprobante) ctx.addIssue({ code: 'custom', path: ['comprobante'], message: 'Indica el comprobante' });
      if (!d.fechaEmision) ctx.addIssue({ code: 'custom', path: ['fechaEmision'], message: 'Indica la fecha de emisión' });
    }
    if (d.estado === 'COBRADO' && !d.fechaCobro) ctx.addIssue({ code: 'custom', path: ['fechaCobro'], message: 'Indica cuándo se recibió el pago' });
  });
type FormData = z.infer<typeof schema>;

const numero = { setValueAs: (v: unknown) => (v === '' || v == null ? 0 : Number(v)) };
// La detracción de servicios es, por lo general, 12 % del total y se redondea sin decimales
const DETRACCION_PCT = 0.12;

export function CobroModal({ proyectoId, state, onClose }: { proyectoId: number; state: { cobro?: Cobro } | null; onClose: () => void }) {
  const cobro = state?.cobro;
  const crear = useCrearCobro(proyectoId);
  const actualizar = useActualizarCobro();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset({
      concepto: cobro?.concepto ?? '',
      monto: cobro?.monto ?? (undefined as unknown as number),
      detraccion: cobro?.detraccion ?? 0,
      penalidad: cobro?.penalidad ?? 0,
      estado: cobro?.estado ?? 'PROGRAMADO',
      fechaProgramada: aInputFecha(cobro?.fechaProgramada),
      comprobante: cobro?.comprobante ?? '',
      fechaEmision: aInputFecha(cobro?.fechaEmision),
      fechaCobro: aInputFecha(cobro?.fechaCobro),
      observacion: cobro?.observacion ?? '',
    });
  }, [state, cobro, reset]);

  const [estado, monto, detraccion, penalidad] = watch(['estado', 'monto', 'detraccion', 'penalidad']);
  const neto = (Number(monto) || 0) - (Number(detraccion) || 0) - (Number(penalidad) || 0);
  const conComprobante = estado === 'FACTURADO' || estado === 'COBRADO';

  const onSubmit = async (f: FormData) => {
    const data = {
      ...f,
      fechaProgramada: f.fechaProgramada || null,
      comprobante: f.comprobante || null,
      fechaEmision: f.fechaEmision || null,
      fechaCobro: f.estado === 'COBRADO' ? f.fechaCobro || null : null,
      observacion: f.observacion.trim() || null,
    };
    try {
      if (cobro) await actualizar.mutateAsync({ id: cobro.id, ...data });
      else await crear.mutateAsync(data);
      onClose();
    } catch (e) {
      // El aviso general ya lo muestra la mutación; aquí se marca el campo
      for (const [campo, mensaje] of Object.entries(erroresDeCampo(e))) if (campo in schema.innerType().shape) setError(campo as keyof FormData, { message: mensaje });
    }
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="lg"
      title={cobro ? 'Editar cobro' : 'Registrar cobro'}
      description="Cada pago pactado con el cliente: por entregable, etapa, avance o adelanto."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cobro-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="cobro-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Input label="Concepto" wrapperClassName="sm:col-span-2" placeholder="Ej. Primer entregable – 30 %" error={errors.concepto?.message} {...register('concepto')} />
        <Input label="Monto del comprobante (S/, con IGV)" type="number" step="0.01" min={0} error={errors.monto?.message} {...register('monto', numero)} />
        <Input label="Fecha programada" type="date" hint="Cuándo se espera facturar" error={errors.fechaProgramada?.message} {...register('fechaProgramada')} />
        <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
          {(Object.keys(ESTADO_COBRO) as EstadoCobro[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_COBRO[e].label}
            </option>
          ))}
        </Select>
        <Input
          label="Comprobante"
          placeholder="E001-123"
          hint={conComprobante ? undefined : 'Al facturar'}
          error={errors.comprobante?.message}
          {...register('comprobante')}
        />
        <Input label="Fecha de emisión" type="date" error={errors.fechaEmision?.message} {...register('fechaEmision')} />
        {estado === 'COBRADO' ? (
          <Input label="Fecha de pago" type="date" error={errors.fechaCobro?.message} {...register('fechaCobro')} />
        ) : (
          <div className="hidden sm:block" />
        )}
        <div>
          <Input label="Detracción (S/)" type="number" step="0.01" min={0} error={errors.detraccion?.message} {...register('detraccion', numero)} />
          <button
            type="button"
            className="mt-1 text-xs font-medium text-brand-700 hover:underline"
            onClick={() => setValue('detraccion', Math.round((Number(monto) || 0) * DETRACCION_PCT), { shouldValidate: true })}
          >
            Calcular 12 % (redondeado)
          </button>
        </div>
        <Input label="Penalidad descontada (S/)" type="number" step="0.01" min={0} hint="Si la entidad descontó mora u otra penalidad" error={errors.penalidad?.message} {...register('penalidad', numero)} />
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:col-span-2">
          Llega a la cuenta de la empresa: <b className={neto < 0 ? 'text-red-600' : 'text-slate-900'}>{formatSoles(neto)}</b>
          <span className="text-slate-500"> (la detracción se deposita en la cuenta del Banco de la Nación)</span>
        </p>
        <Textarea label="Observación" wrapperClassName="sm:col-span-2" rows={2} error={errors.observacion?.message} {...register('observacion')} />
      </form>
    </Modal>
  );
}
