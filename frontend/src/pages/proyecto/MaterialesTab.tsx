// Módulo de materiales OCULTO en la interfaz: INGELOP es una consultora de diseño y no maneja almacén.
// Se conserva (igual que la API /materiales) por si en el futuro ejecutan obras. Para reactivarlo, agrega la pestaña en ProyectoPage.tsx.
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, History, Package, Pencil, Plus } from 'lucide-react';
import {
  useActualizarMaterial,
  useAlertasMateriales,
  useCrearMaterial,
  useMateriales,
  useMovimientos,
  useRegistrarMovimiento,
} from '@/api/recursos';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, CardHeader, EmptyState, ErrorState, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { formatFechaHora, formatNumero } from '@/lib/format';
import type { Material, TipoMovimiento } from '@/types/api';

export default function MaterialesTab({ proyectoId }: { proyectoId: number }) {
  const { esAdmin } = useAuth();
  return esAdmin ? <InventarioAdmin proyectoId={proyectoId} /> : <AlertasUsuario proyectoId={proyectoId} />;
}

function AlertasUsuario({ proyectoId }: { proyectoId: number }) {
  const { data, isLoading, error, refetch } = useAlertasMateriales(proyectoId);
  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <Card>
      <CardHeader title="Materiales con stock bajo" subtitle="Avisa al administrador si necesitas reposición." />
      {data?.length ? (
        <ul className="divide-y divide-slate-100">
          {data.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              <span className="flex-1 text-sm font-medium text-slate-800">{m.nombre}</span>
              <span className="text-sm tabular-nums text-slate-600">
                {formatNumero(m.stockActual)} / mín. {formatNumero(m.stockMinimo)} {m.unidad}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Package className="size-6" />} title="Sin alertas" description="Todos los materiales están sobre su stock mínimo." />
      )}
    </Card>
  );
}

function InventarioAdmin({ proyectoId }: { proyectoId: number }) {
  const { data: materiales, isLoading, error, refetch } = useMateriales(proyectoId);
  const [materialModal, setMaterialModal] = useState<{ material?: Material } | null>(null);
  const [movimiento, setMovimiento] = useState<{ material: Material; tipo: TipoMovimiento } | null>(null);
  const [kardex, setKardex] = useState<Material | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const enAlerta = materiales?.filter((m) => m.enAlerta).length ?? 0;

  return (
    <>
      <Card>
        <CardHeader
          title="Inventario de la obra"
          subtitle={`${materiales?.length ?? 0} materiales${enAlerta ? ` · ${enAlerta} con stock bajo` : ''}`}
          action={
            <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setMaterialModal({})}>
              Material
            </Button>
          }
        />
        {materiales?.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Material</th>
                <th className={`${th} text-right`}>Stock actual</th>
                <th className={`${th} text-right`}>Stock mínimo</th>
                <th className={th}>Estado</th>
                <th className={`${th} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {materiales.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className={td}>
                    <p className="font-medium text-slate-900">{m.nombre}</p>
                    <p className="text-xs text-slate-500">{m.unidad}</p>
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatNumero(m.stockActual)}</td>
                  <td className={`${td} text-right tabular-nums text-slate-500`}>{formatNumero(m.stockMinimo)}</td>
                  <td className={td}>
                    {m.enAlerta ? (
                      <Badge color="amber">
                        <AlertTriangle className="size-3" />
                        Faltan {formatNumero(m.faltante)}
                      </Badge>
                    ) : (
                      <Badge color="green">OK</Badge>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="secondary" icon={<ArrowDownToLine className="size-4 text-emerald-600" />} onClick={() => setMovimiento({ material: m, tipo: 'ENTRADA' })}>
                        Entrada
                      </Button>
                      <Button size="sm" variant="secondary" icon={<ArrowUpFromLine className="size-4 text-red-600" />} onClick={() => setMovimiento({ material: m, tipo: 'SALIDA' })}>
                        Salida
                      </Button>
                      <IconButton label="Ver movimientos" onClick={() => setKardex(m)}>
                        <History className="size-4" />
                      </IconButton>
                      <IconButton label="Editar material" onClick={() => setMaterialModal({ material: m })}>
                        <Pencil className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            icon={<Package className="size-6" />}
            title="Sin materiales"
            description="Registra los materiales de la obra para controlar su stock y recibir alertas."
          />
        )}
      </Card>

      <MaterialModal proyectoId={proyectoId} state={materialModal} onClose={() => setMaterialModal(null)} />
      <MovimientoModal proyectoId={proyectoId} state={movimiento} onClose={() => setMovimiento(null)} />
      <KardexModal material={kardex} onClose={() => setKardex(null)} />
    </>
  );
}

const materialSchema = z.object({
  nombre: z.string().trim().min(2, 'Requerido'),
  unidad: z.string().trim().min(1, 'Requerido'),
  stockMinimo: z.number({ invalid_type_error: 'Ingresa un número' }).min(0, 'No puede ser negativo'),
  stockInicial: z.number().min(0, 'No puede ser negativo').optional(),
});
type MaterialForm = z.infer<typeof materialSchema>;

function MaterialModal({ proyectoId, state, onClose }: { proyectoId: number; state: { material?: Material } | null; onClose: () => void }) {
  const material = state?.material;
  const crear = useCrearMaterial(proyectoId);
  const actualizar = useActualizarMaterial(proyectoId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaterialForm>({ resolver: zodResolver(materialSchema) });

  useEffect(() => {
    if (!state) return;
    reset(material ? { nombre: material.nombre, unidad: material.unidad, stockMinimo: material.stockMinimo } : { nombre: '', unidad: '', stockMinimo: undefined, stockInicial: undefined });
  }, [state, material, reset]);

  const onSubmit = async (data: MaterialForm) => {
    if (material) {
      const { stockInicial: _i, ...resto } = data;
      void _i;
      await actualizar.mutateAsync({ id: material.id, ...resto });
    } else {
      await crear.mutateAsync(data);
    }
    onClose();
  };

  const numOpcional = { setValueAs: (v: string) => (v === '' || v == null ? undefined : Number(v)) };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={material ? 'Editar material' : 'Nuevo material'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="material-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="material-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Material" wrapperClassName="col-span-2" placeholder="Ej. Cemento Portland Tipo I" error={errors.nombre?.message} {...register('nombre')} />
        <Input label="Unidad" placeholder="bolsa, m3, kg, und…" error={errors.unidad?.message} {...register('unidad')} />
        <Input label="Stock mínimo" type="number" step="0.01" min={0} error={errors.stockMinimo?.message} {...register('stockMinimo', numOpcional)} />
        {!material && (
          <Input
            label="Stock inicial"
            type="number"
            step="0.01"
            min={0}
            hint="Opcional: se registra como una entrada"
            error={errors.stockInicial?.message}
            {...register('stockInicial', numOpcional)}
          />
        )}
      </form>
    </Modal>
  );
}

const movimientoSchema = z.object({
  cantidad: z.number({ invalid_type_error: 'Ingresa una cantidad' }).positive('Debe ser mayor a 0'),
  observacion: z.string().trim().max(500).optional(),
});
type MovimientoForm = z.infer<typeof movimientoSchema>;

function MovimientoModal({ proyectoId, state, onClose }: { proyectoId: number; state: { material: Material; tipo: TipoMovimiento } | null; onClose: () => void }) {
  const registrar = useRegistrarMovimiento(proyectoId);
  const [tipo, setTipo] = useState<TipoMovimiento>('ENTRADA');
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MovimientoForm>({ resolver: zodResolver(movimientoSchema) });

  useEffect(() => {
    if (!state) return;
    setTipo(state.tipo);
    reset({ cantidad: undefined, observacion: '' });
  }, [state, reset]);

  if (!state) return null;
  const { material } = state;
  const cantidad = watch('cantidad') || 0;
  const resultante = tipo === 'ENTRADA' ? material.stockActual + cantidad : material.stockActual - cantidad;
  const insuficiente = tipo === 'SALIDA' && resultante < 0;

  const onSubmit = async (data: MovimientoForm) => {
    await registrar.mutateAsync({ materialId: material.id, tipo, cantidad: data.cantidad, observacion: data.observacion || undefined });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Registrar ${tipo === 'ENTRADA' ? 'entrada' : 'salida'}`}
      description={material.nombre}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="movimiento-form" loading={registrar.isPending} disabled={insuficiente}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="movimiento-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoMovimiento)}>
          <option value="ENTRADA">Entrada (compra / ingreso)</option>
          <option value="SALIDA">Salida (consumo en obra)</option>
        </Select>
        <Input
          label={`Cantidad (${material.unidad})`}
          type="number"
          step="0.01"
          min={0}
          error={errors.cantidad?.message}
          {...register('cantidad', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        />
        <Input label="Observación" placeholder="Opcional" error={errors.observacion?.message} {...register('observacion')} />
        <div className={`rounded-lg px-3 py-2 text-sm ${insuficiente ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
          Stock actual: <strong className="tabular-nums">{formatNumero(material.stockActual)}</strong> → quedará en{' '}
          <strong className="tabular-nums">{formatNumero(resultante)}</strong> {material.unidad}
          {insuficiente && <p className="mt-1 font-medium">Stock insuficiente para esta salida.</p>}
        </div>
      </form>
    </Modal>
  );
}

function KardexModal({ material, onClose }: { material: Material | null; onClose: () => void }) {
  const { data, isLoading, error } = useMovimientos(material?.id ?? null);
  return (
    <Modal open={!!material} onClose={onClose} title="Movimientos" description={material?.nombre} size="lg">
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data?.length ? (
        <EmptyState title="Sin movimientos" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Fecha</th>
              <th className={th}>Tipo</th>
              <th className={`${th} text-right`}>Cantidad</th>
              <th className={th}>Observación</th>
              <th className={th}>Registró</th>
            </tr>
          </thead>
          <tbody>
            {data.map((mv) => (
              <tr key={mv.id}>
                <td className={`${td} whitespace-nowrap text-slate-600`}>{formatFechaHora(mv.fecha)}</td>
                <td className={td}>{mv.tipo === 'ENTRADA' ? <Badge color="green">Entrada</Badge> : <Badge color="red">Salida</Badge>}</td>
                <td className={`${td} text-right font-medium tabular-nums`}>
                  {mv.tipo === 'ENTRADA' ? '+' : '−'}
                  {formatNumero(mv.cantidad)} {material?.unidad}
                </td>
                <td className={`${td} text-slate-600`}>{mv.observacion ?? '—'}</td>
                <td className={`${td} text-slate-600`}>{mv.usuario.nombre}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal>
  );
}
