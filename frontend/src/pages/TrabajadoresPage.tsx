import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { HardHat, Pencil, Plus, Search } from 'lucide-react';
import { useActualizarTrabajador, useCrearTrabajador, useTrabajadores } from '@/api/admin';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatSoles } from '@/lib/format';
import type { Trabajador } from '@/types/api';

export default function TrabajadoresPage() {
  const [q, setQ] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState<{ trabajador?: Trabajador } | null>(null);
  const busqueda = useDeferredValue(q.trim());
  const { data: trabajadores, isLoading, error, refetch } = useTrabajadores({
    ...(busqueda && { q: busqueda }),
    ...(!verInactivos && { activo: true }),
  });
  const actualizar = useActualizarTrabajador();

  return (
    <>
      <PageHeader
        title="Personal y tarifas"
        subtitle="Profesionales con su costo por hora, para registrar horas y calcular el costo de cada proyecto. No necesitan cuenta para entrar a la intranet."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
            Nuevo profesional
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nombre, DNI o cargo…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar profesionales" />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="size-4 accent-amber-500" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
          Incluir inactivos
        </label>
      </div>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !trabajadores?.length ? (
          <EmptyState icon={<HardHat className="size-6" />} title={busqueda ? 'Sin resultados' : 'Sin profesionales'} description={busqueda ? undefined : 'Registra a tus profesionales y su costo por hora para controlar las horas de cada proyecto.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Profesional</th>
                <th className={th}>DNI</th>
                <th className={th}>Cargo</th>
                <th className={`${th} text-right`}>Costo/hora</th>
                <th className={th}>Proyectos actuales</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} className={t.activo ? 'hover:bg-slate-50' : 'text-slate-400'}>
                  <td className={td}>
                    <span className="font-medium text-slate-900">{t.nombre}</span>
                    {!t.activo && (
                      <Badge color="red" className="ml-2">
                        Inactivo
                      </Badge>
                    )}
                  </td>
                  <td className={`${td} tabular-nums`}>{t.dni}</td>
                  <td className={td}>{t.cargo}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatSoles(t.costoHora)}</td>
                  <td className={td}>
                    {t.asignaciones?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.asignaciones.map((a) => (
                          <Link key={a.id} to={`/proyectos/${a.proyecto.id}/equipo`} className="text-xs font-medium text-brand-700 hover:underline">
                            {a.proyecto.nombre}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Disponible</span>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end">
                      {t.activo ? (
                        <IconButton label="Editar trabajador" onClick={() => setModal({ trabajador: t })}>
                          <Pencil className="size-4" />
                        </IconButton>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => actualizar.mutate({ id: t.id, activo: true })}>
                          Reactivar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <TrabajadorModal state={modal} onClose={() => setModal(null)} />
    </>
  );
}

const schema = z.object({
  dni: z.string().trim().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  nombre: z.string().trim().min(3, 'Mínimo 3 caracteres'),
  cargo: z.string().trim().min(2, 'Requerido'),
  costoHora: z.number({ invalid_type_error: 'Ingresa un monto' }).nonnegative('No puede ser negativo'),
});
type FormData = z.infer<typeof schema>;

function TrabajadorModal({ state, onClose }: { state: { trabajador?: Trabajador } | null; onClose: () => void }) {
  const trabajador = state?.trabajador;
  const crear = useCrearTrabajador();
  const actualizar = useActualizarTrabajador();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset(
      trabajador
        ? { dni: trabajador.dni, nombre: trabajador.nombre, cargo: trabajador.cargo, costoHora: trabajador.costoHora }
        : { dni: '', nombre: '', cargo: '', costoHora: undefined },
    );
  }, [state, trabajador, reset]);

  const onSubmit = async (data: FormData) => {
    if (trabajador) await actualizar.mutateAsync({ id: trabajador.id, ...data });
    else await crear.mutateAsync(data);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={trabajador ? 'Editar profesional' : 'Nuevo profesional'}
      footer={
        <>
          {trabajador && (
            <Button
              variant="ghost"
              className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              loading={actualizar.isPending}
              onClick={async () => {
                await actualizar.mutateAsync({ id: trabajador.id, activo: false });
                onClose();
              }}
            >
              Desactivar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="trabajador-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="trabajador-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Input label="Nombre completo" wrapperClassName="col-span-2" error={errors.nombre?.message} {...register('nombre')} />
        <Input label="DNI" inputMode="numeric" maxLength={8} error={errors.dni?.message} {...register('dni')} />
        <Input label="Cargo" placeholder="Arquitecto, Ing. estructural, Dibujante CAD…" error={errors.cargo?.message} {...register('cargo')} />
        <Input
          label="Costo por hora (S/)"
          type="number"
          step="0.01"
          min={0}
          error={errors.costoHora?.message}
          {...register('costoHora', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        />
      </form>
    </Modal>
  );
}
