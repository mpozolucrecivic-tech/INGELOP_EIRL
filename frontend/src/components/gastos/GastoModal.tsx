import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCrearGastoEmpresa } from '@/api/gastos';
import { useActualizarGasto, useCrearGasto } from '@/api/recursos';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { aInputFecha, CATEGORIAS_EMPRESA, CATEGORIAS_PROYECTO, etiquetasCategoria, hoyInput } from '@/lib/format';
import type { CategoriaGasto, Gasto } from '@/types/api';

const schema = z.object({
  categoria: z.string().min(1, 'Requerido'),
  descripcion: z.string().trim().min(3, 'Mínimo 3 caracteres'),
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto' })
    .positive('Debe ser mayor a 0')
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Máximo 2 decimales'),
  fecha: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

/** Registrar o editar un gasto de un proyecto (proyectoId) o de la empresa (proyectoId null) */
export function GastoModal({ proyectoId, state, onClose }: { proyectoId: number | null; state: { gasto?: Gasto } | null; onClose: () => void }) {
  const gasto = state?.gasto;
  const categorias = proyectoId === null ? CATEGORIAS_EMPRESA : CATEGORIAS_PROYECTO;
  const etiquetas = etiquetasCategoria(proyectoId === null);
  const crearProyecto = useCrearGasto(proyectoId ?? 0);
  const crearEmpresa = useCrearGastoEmpresa();
  const actualizar = useActualizarGasto(proyectoId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset(
      gasto
        ? { categoria: gasto.categoria, descripcion: gasto.descripcion, monto: gasto.monto, fecha: aInputFecha(gasto.fecha) }
        : { categoria: categorias[0], descripcion: '', monto: undefined, fecha: hoyInput() },
    );
  }, [state, gasto, reset, categorias]);

  const onSubmit = async (form: FormData) => {
    const data = { ...form, categoria: form.categoria as CategoriaGasto };
    if (gasto) await actualizar.mutateAsync({ id: gasto.id, ...data });
    else if (proyectoId === null) await crearEmpresa.mutateAsync(data);
    else await crearProyecto.mutateAsync(data);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={gasto ? 'Editar gasto' : 'Registrar gasto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="gasto-form" loading={crearProyecto.isPending || crearEmpresa.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="gasto-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input
          label="Descripción"
          wrapperClassName="col-span-2"
          placeholder={proyectoId === null ? 'Ej. Alquiler de oficina – marzo' : 'Ej. Ploteo de planos de estructuras'}
          error={errors.descripcion?.message}
          {...register('descripcion')}
        />
        <Select label="Categoría" error={errors.categoria?.message} {...register('categoria')}>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {etiquetas[c]}
            </option>
          ))}
        </Select>
        <Input label="Fecha" type="date" error={errors.fecha?.message} {...register('fecha')} />
        <Input
          label="Monto (S/)"
          type="number"
          step="0.01"
          min={0}
          error={errors.monto?.message}
          {...register('monto', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        />
      </form>
    </Modal>
  );
}
