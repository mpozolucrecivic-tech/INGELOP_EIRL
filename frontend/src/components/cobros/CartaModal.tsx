import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useActualizarCarta, useCrearCarta, useRenovarCarta } from '@/api/cobros';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { aInputFecha, formatSoles, hoyInput, TIPO_GARANTIA } from '@/lib/format';
import type { CartaFianza, TipoGarantia } from '@/types/api';

const monto = z
  .number({ invalid_type_error: 'Ingresa un monto' })
  .positive('Debe ser mayor a 0')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Máximo 2 decimales');
const fechas = <T extends { fechaEmision: string; fechaVencimiento: string }>(d: T) => !d.fechaEmision || !d.fechaVencimiento || d.fechaVencimiento > d.fechaEmision;
const MSJ = { message: 'Debe ser posterior a la emisión', path: ['fechaVencimiento'] };
const numero = { setValueAs: (v: unknown) => (v === '' || v == null ? undefined : Number(v)) };

const schema = z
  .object({
    tipo: z.enum(['FIEL_CUMPLIMIENTO', 'ADELANTO', 'OTRA']),
    numero: z.string().trim().min(1, 'Requerido').max(60),
    entidadFinanciera: z.string().trim().min(2, 'Requerido').max(120),
    monto,
    fechaEmision: z.string().min(1, 'Requerido'),
    fechaVencimiento: z.string().min(1, 'Requerido'),
    estado: z.enum(['VIGENTE', 'DEVUELTA', 'EJECUTADA']),
    observacion: z.string().max(1000),
  })
  .refine(fechas, MSJ);
type FormData = z.infer<typeof schema>;

/** Registrar o editar una carta fianza. montoContrato sirve para sugerir el 10 % de fiel cumplimiento */
export function CartaModal({ proyectoId, montoContrato, state, onClose }: { proyectoId: number; montoContrato: number; state: { carta?: CartaFianza } | null; onClose: () => void }) {
  const carta = state?.carta;
  const crear = useCrearCarta(proyectoId);
  const actualizar = useActualizarCarta();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset({
      tipo: carta?.tipo ?? 'FIEL_CUMPLIMIENTO',
      numero: carta?.numero ?? '',
      entidadFinanciera: carta?.entidadFinanciera ?? '',
      monto: carta?.monto ?? (undefined as unknown as number),
      fechaEmision: aInputFecha(carta?.fechaEmision) || hoyInput(),
      fechaVencimiento: aInputFecha(carta?.fechaVencimiento),
      estado: carta && carta.estado !== 'RENOVADA' ? carta.estado : 'VIGENTE',
      observacion: carta?.observacion ?? '',
    });
  }, [state, carta, reset]);

  const onSubmit = async ({ estado, ...f }: FormData) => {
    const data = { ...f, observacion: f.observacion.trim() || null };
    if (carta) await actualizar.mutateAsync({ id: carta.id, ...data, ...(carta.estado !== 'RENOVADA' && { estado }) });
    else await crear.mutateAsync(data);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={carta ? `Carta fianza N.° ${carta.numero}` : 'Registrar carta fianza'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="carta-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="carta-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Select label="Tipo de garantía" error={errors.tipo?.message} {...register('tipo')}>
          {(Object.keys(TIPO_GARANTIA) as TipoGarantia[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_GARANTIA[t]}
            </option>
          ))}
        </Select>
        <Input label="Número de la carta" error={errors.numero?.message} {...register('numero')} />
        <Input label="Banco o entidad" wrapperClassName="sm:col-span-2" placeholder="Ej. Banco de Crédito del Perú" error={errors.entidadFinanciera?.message} {...register('entidadFinanciera')} />
        <div>
          <Input label="Monto garantizado (S/)" type="number" step="0.01" min={0} error={errors.monto?.message} {...register('monto', numero)} />
          {montoContrato > 0 && (
            <button
              type="button"
              className="mt-1 text-xs font-medium text-brand-700 hover:underline"
              onClick={() => setValue('monto', Math.round(montoContrato * 10) / 100, { shouldValidate: true })}
            >
              10 % del contrato: {formatSoles(Math.round(montoContrato * 10) / 100)}
            </button>
          )}
        </div>
        {carta && carta.estado !== 'RENOVADA' ? (
          <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
            <option value="VIGENTE">Vigente</option>
            <option value="DEVUELTA">Devuelta por la entidad</option>
            <option value="EJECUTADA">Ejecutada (cobrada por la entidad)</option>
          </Select>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Input label="Emisión" type="date" error={errors.fechaEmision?.message} {...register('fechaEmision')} />
        <Input label="Vencimiento" type="date" error={errors.fechaVencimiento?.message} {...register('fechaVencimiento')} />
        <Textarea label="Observación" wrapperClassName="sm:col-span-2" rows={2} error={errors.observacion?.message} {...register('observacion')} />
      </form>
    </Modal>
  );
}

const schemaRenovar = z
  .object({
    numero: z.string().trim().min(1, 'Requerido').max(60),
    entidadFinanciera: z.string().trim().min(2, 'Requerido').max(120),
    monto,
    fechaEmision: z.string().min(1, 'Requerido'),
    fechaVencimiento: z.string().min(1, 'Requerido'),
  })
  .refine(fechas, MSJ);
type FormRenovar = z.infer<typeof schemaRenovar>;

/** La carta actual queda como "Renovada" y se registra la nueva */
export function RenovarCartaModal({ carta, onClose }: { carta: CartaFianza | null; onClose: () => void }) {
  const renovar = useRenovarCarta();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormRenovar>({ resolver: zodResolver(schemaRenovar) });

  useEffect(() => {
    if (carta) reset({ numero: '', entidadFinanciera: carta.entidadFinanciera, monto: carta.monto, fechaEmision: hoyInput(), fechaVencimiento: '' });
  }, [carta, reset]);

  const onSubmit = async (f: FormRenovar) => {
    await renovar.mutateAsync({ id: carta!.id, ...f });
    onClose();
  };

  return (
    <Modal
      open={!!carta}
      onClose={onClose}
      title={carta ? `Renovar la carta N.° ${carta.numero}` : ''}
      description="La carta actual quedará como «Renovada» y se registrará la nueva."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="renovar-form" loading={renovar.isPending}>
            Registrar renovación
          </Button>
        </>
      }
    >
      <form id="renovar-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Input label="Número de la nueva carta" error={errors.numero?.message} {...register('numero')} />
        <Input label="Monto garantizado (S/)" type="number" step="0.01" min={0} error={errors.monto?.message} {...register('monto', numero)} />
        <Input label="Banco o entidad" wrapperClassName="sm:col-span-2" error={errors.entidadFinanciera?.message} {...register('entidadFinanciera')} />
        <Input label="Emisión" type="date" error={errors.fechaEmision?.message} {...register('fechaEmision')} />
        <Input label="Nuevo vencimiento" type="date" error={errors.fechaVencimiento?.message} {...register('fechaVencimiento')} />
      </form>
    </Modal>
  );
}
