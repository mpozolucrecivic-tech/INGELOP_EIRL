import { useEffect, useState } from 'react';
import { TextoAyuda } from '@/components/Common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { useActualizarGasto, useCrearGasto, useEliminarGasto, useGastos, useResumenGastos } from '@/api/recursos';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState, ErrorState, ProgressBar, Spinner, StatCard, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { aInputFecha, CATEGORIA_GASTO, COLORES_CATEGORIA, formatFecha, formatPorcentaje, formatSoles, hoyInput } from '@/lib/format';
import type { CategoriaGasto, Gasto } from '@/types/api';

const CATEGORIAS = Object.keys(CATEGORIA_GASTO) as CategoriaGasto[];

export default function GastosTab({ proyectoId }: { proyectoId: number }) {
  const [categoria, setCategoria] = useState<CategoriaGasto | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [modal, setModal] = useState<{ gasto?: Gasto } | null>(null);
  const { data: resumen } = useResumenGastos(proyectoId);
  const { data: gastos, isLoading, error, refetch } = useGastos(proyectoId, {
    ...(categoria && { categoria }),
    ...(desde && { desde }),
    ...(hasta && { hasta }),
  });
  const eliminar = useEliminarGasto(proyectoId);
  const { confirm, dialog } = useConfirm();

  const totalFiltrado = gastos?.reduce((s, g) => s + g.monto, 0) ?? 0;

  return (
    <div className="space-y-6">
      <TextoAyuda>Lo que el proyecto le cuesta a la empresa (planilla, viáticos, estudios, trámites…) frente al monto cobrado al cliente.</TextoAyuda>
      {resumen && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Monto del contrato" value={formatSoles(resumen.montoContrato)} hint="Honorarios pactados con el cliente" />
          <StatCard
            label="Gastos del servicio"
            value={formatSoles(resumen.totalGastado)}
            tone={resumen.sobrepresupuesto ? 'danger' : 'default'}
            hint={
              <div className="space-y-1.5">
                <ProgressBar value={resumen.porcentajeEjecutado} color={resumen.sobrepresupuesto ? 'red' : 'brand'} />
                <span>{formatPorcentaje(resumen.porcentajeEjecutado)} del monto del contrato</span>
              </div>
            }
          />
          <StatCard
            label="Margen"
            value={formatSoles(resumen.saldo)}
            tone={resumen.saldo < 0 ? 'danger' : 'success'}
            hint={
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" title="Distribución por categoría">
                {resumen.porCategoria.map((c) => (
                  <div key={c.categoria} style={{ width: `${c.porcentaje}%`, background: COLORES_CATEGORIA[c.categoria] }} title={`${CATEGORIA_GASTO[c.categoria]}: ${c.porcentaje}%`} />
                ))}
              </div>
            }
          />
        </div>
      )}

      <Card>
        <CardHeader
          title="Gastos"
          subtitle={gastos ? `${gastos.length} registros · ${formatSoles(totalFiltrado)}` : undefined}
          action={
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setModal({})}>
              Gasto
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 px-5 py-3 sm:grid-cols-3">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto | '')} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_GASTO[c]}
              </option>
            ))}
          </Select>
          <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} aria-label="Desde" />
          <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} aria-label="Hasta" />
        </div>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !gastos?.length ? (
          <EmptyState icon={<Receipt className="size-6" />} title="Sin gastos" description="Registra honorarios, estudios, viáticos, impresiones y demás gastos del servicio." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Fecha</th>
                <th className={th}>Descripción</th>
                <th className={th}>Categoría</th>
                <th className={`${th} text-right`}>Monto</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFecha(g.fecha)}</td>
                  <td className={`${td} font-medium text-slate-900`}>{g.descripcion}</td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="size-2 rounded-full" style={{ background: COLORES_CATEGORIA[g.categoria] }} />
                      {CATEGORIA_GASTO[g.categoria]}
                    </span>
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatSoles(g.monto)}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      <IconButton label="Editar gasto" onClick={() => setModal({ gasto: g })}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton
                        label="Eliminar gasto"
                        className="hover:text-red-600"
                        onClick={() =>
                          confirm({
                            title: 'Eliminar gasto',
                            message: `¿Eliminar "${g.descripcion}" por ${formatSoles(g.monto)}?`,
                            onConfirm: () => eliminar.mutateAsync(g.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <GastoModal proyectoId={proyectoId} state={modal} onClose={() => setModal(null)} />
      {dialog}
    </div>
  );
}

const schema = z.object({
  categoria: z.enum(['MATERIALES', 'MANO_DE_OBRA', 'TRANSPORTE', 'EQUIPOS', 'OTROS']),
  descripcion: z.string().trim().min(3, 'Mínimo 3 caracteres'),
  monto: z
    .number({ invalid_type_error: 'Ingresa un monto' })
    .positive('Debe ser mayor a 0')
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Máximo 2 decimales'),
  fecha: z.string().min(1, 'Requerido'),
});
type FormData = z.infer<typeof schema>;

function GastoModal({ proyectoId, state, onClose }: { proyectoId: number; state: { gasto?: Gasto } | null; onClose: () => void }) {
  const gasto = state?.gasto;
  const crear = useCrearGasto(proyectoId);
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
        : { categoria: 'MATERIALES', descripcion: '', monto: undefined, fecha: hoyInput() },
    );
  }, [state, gasto, reset]);

  const onSubmit = async (data: FormData) => {
    if (gasto) await actualizar.mutateAsync({ id: gasto.id, ...data });
    else await crear.mutateAsync(data);
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
          <Button type="submit" form="gasto-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="gasto-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Descripción" wrapperClassName="col-span-2" placeholder="Ej. Compra de 200 bolsas de cemento" error={errors.descripcion?.message} {...register('descripcion')} />
        <Select label="Categoría" error={errors.categoria?.message} {...register('categoria')}>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_GASTO[c]}
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
