import { useDeferredValue, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Mail, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { useActualizarCliente, useClientes, useCrearCliente, useEliminarCliente } from '@/api/admin';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { TIPO_CLIENTE } from '@/lib/format';
import type { Cliente, TipoCliente } from '@/types/api';

export default function ClientesPage() {
  const [q, setQ] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState<{ cliente?: Cliente } | null>(null);
  const busqueda = useDeferredValue(q.trim());
  const { data: clientes, isLoading, error, refetch } = useClientes({
    ...(busqueda && { q: busqueda }),
    ...(!verInactivos && { activo: true }),
  });
  const actualizar = useActualizarCliente();
  const eliminar = useEliminarCliente();
  const { confirm, dialog } = useConfirm();

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Entidades públicas, empresas y personas para las que INGELOP desarrolla proyectos."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
            Nuevo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar por nombre, RUC/DNI o contacto…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" aria-label="Buscar clientes" />
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
        ) : !clientes?.length ? (
          <EmptyState icon={<Briefcase className="size-6" />} title={busqueda ? 'Sin resultados' : 'Sin clientes'} description={busqueda ? undefined : 'Registra a tus clientes para asociarlos a los proyectos.'} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Cliente</th>
                <th className={th}>Tipo</th>
                <th className={th}>RUC / DNI</th>
                <th className={th}>Contacto</th>
                <th className={`${th} text-center`}>Proyectos</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className={c.activo ? 'hover:bg-slate-50' : 'text-slate-400'}>
                  <td className={td}>
                    <span className="font-medium text-slate-900">{c.nombre}</span>
                    {!c.activo && (
                      <Badge color="red" className="ml-2">
                        Inactivo
                      </Badge>
                    )}
                    {c.direccion && <p className="text-xs text-slate-500">{c.direccion}</p>}
                  </td>
                  <td className={td}>
                    <Badge color={c.tipo === 'ENTIDAD_PUBLICA' ? 'blue' : c.tipo === 'EMPRESA' ? 'violet' : 'slate'}>{TIPO_CLIENTE[c.tipo]}</Badge>
                  </td>
                  <td className={`${td} tabular-nums`}>{c.documento ?? '—'}</td>
                  <td className={`${td} text-xs text-slate-600`}>
                    {c.contacto && <p className="font-medium text-slate-700">{c.contacto}</p>}
                    {c.telefono && (
                      <p className="flex items-center gap-1">
                        <Phone className="size-3" />
                        {c.telefono}
                      </p>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-brand-700">
                        <Mail className="size-3" />
                        {c.email}
                      </a>
                    )}
                    {!c.contacto && !c.telefono && !c.email && '—'}
                  </td>
                  <td className={`${td} text-center`}>
                    {c._count?.proyectos ? (
                      <Link to={`/proyectos?q=${encodeURIComponent(c.nombre)}`} className="font-medium text-brand-700 hover:underline">
                        {c._count.proyectos}
                      </Link>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex justify-end">
                      {c.activo ? (
                        <>
                          <IconButton label="Editar cliente" onClick={() => setModal({ cliente: c })}>
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton
                            label={c._count?.proyectos ? 'Desactivar cliente' : 'Eliminar cliente'}
                            className="hover:text-red-600"
                            onClick={() =>
                              c._count?.proyectos
                                ? confirm({
                                    title: 'Desactivar cliente',
                                    message: `${c.nombre} tiene proyectos, así que se desactivará (ya no aparecerá al crear proyectos). Sus proyectos se conservan.`,
                                    confirmText: 'Desactivar',
                                    onConfirm: () => actualizar.mutateAsync({ id: c.id, activo: false }),
                                  })
                                : confirm({ title: 'Eliminar cliente', message: `¿Eliminar a ${c.nombre}?`, onConfirm: () => eliminar.mutateAsync(c.id) })
                            }
                          >
                            <Trash2 className="size-4" />
                          </IconButton>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => actualizar.mutate({ id: c.id, activo: true })}>
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

      <ClienteModal state={modal} onClose={() => setModal(null)} />
      {dialog}
    </>
  );
}

const opcional = z.string().trim().optional();
const schema = z.object({
  tipo: z.enum(['ENTIDAD_PUBLICA', 'EMPRESA', 'PERSONA']),
  nombre: z.string().trim().min(2, 'Requerido'),
  documento: z
    .string()
    .trim()
    .refine((v) => v === '' || /^(\d{8}|\d{11})$/.test(v), 'DNI (8 dígitos) o RUC (11 dígitos)')
    .optional(),
  contacto: opcional,
  telefono: opcional,
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Email inválido')
    .optional(),
  direccion: opcional,
});
type FormData = z.infer<typeof schema>;

function ClienteModal({ state, onClose }: { state: { cliente?: Cliente } | null; onClose: () => void }) {
  const cliente = state?.cliente;
  const crear = useCrearCliente();
  const actualizar = useActualizarCliente();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset({
      tipo: cliente?.tipo ?? 'ENTIDAD_PUBLICA',
      nombre: cliente?.nombre ?? '',
      documento: cliente?.documento ?? '',
      contacto: cliente?.contacto ?? '',
      telefono: cliente?.telefono ?? '',
      email: cliente?.email ?? '',
      direccion: cliente?.direccion ?? '',
    });
  }, [state, cliente, reset]);

  const tipo = watch('tipo');

  const onSubmit = async (data: FormData) => {
    // '' -> undefined para campos opcionales
    const limpio = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])) as FormData & { tipo: TipoCliente; nombre: string };
    if (cliente) await actualizar.mutateAsync({ id: cliente.id, ...limpio });
    else await crear.mutateAsync(limpio);
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="cliente-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4" noValidate>
        <Select label="Tipo" error={errors.tipo?.message} {...register('tipo')}>
          {(Object.keys(TIPO_CLIENTE) as TipoCliente[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_CLIENTE[t]}
            </option>
          ))}
        </Select>
        <Input label={tipo === 'PERSONA' ? 'DNI o RUC' : 'RUC'} inputMode="numeric" maxLength={11} error={errors.documento?.message} {...register('documento')} />
        <Input
          label={tipo === 'PERSONA' ? 'Nombre completo' : tipo === 'ENTIDAD_PUBLICA' ? 'Entidad' : 'Razón social'}
          wrapperClassName="col-span-2"
          placeholder={tipo === 'ENTIDAD_PUBLICA' ? 'Ej. Municipalidad Distrital de …' : undefined}
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <Input label="Persona de contacto" wrapperClassName="col-span-2" placeholder={tipo === 'ENTIDAD_PUBLICA' ? 'Ej. Gerencia de Infraestructura' : undefined} {...register('contacto')} />
        <Input label="Teléfono" {...register('telefono')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Dirección" wrapperClassName="col-span-2" {...register('direccion')} />
      </form>
    </Modal>
  );
}
