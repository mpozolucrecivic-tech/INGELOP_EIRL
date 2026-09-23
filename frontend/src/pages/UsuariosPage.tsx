import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, UserX, Users } from 'lucide-react';
import { useActualizarUsuario, useCrearUsuario, useDesactivarUsuario, useUsuarios } from '@/api/admin';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, td, th } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Modal, useConfirm } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { formatFecha } from '@/lib/format';
import type { Usuario } from '@/types/api';

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const [verInactivos, setVerInactivos] = useState(false);
  const [modal, setModal] = useState<{ usuario?: Usuario } | null>(null);
  const { data: usuarios, isLoading, error, refetch } = useUsuarios(verInactivos ? {} : { activo: true });
  const desactivar = useDesactivarUsuario();
  const reactivar = useActualizarUsuario();
  const { confirm, dialog } = useConfirm();

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Cuentas de acceso a la intranet. El equipo técnico solo ve los proyectos donde tiene acceso."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setModal({})}>
            Nuevo usuario
          </Button>
        }
      />

      <label className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" className="size-4 accent-amber-500" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
        Mostrar usuarios desactivados
      </label>

      <Card>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !usuarios?.length ? (
          <EmptyState icon={<Users className="size-6" />} title="Sin usuarios" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Nombre</th>
                <th className={th}>Rol</th>
                <th className={th}>Proyectos asignados</th>
                <th className={th}>Alta</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.activo ? 'hover:bg-slate-50' : 'bg-slate-50/60 text-slate-400'}>
                  <td className={td}>
                    <p className="font-medium text-slate-900">
                      {u.nombre} {u.id === yo?.id && <span className="text-xs font-normal text-slate-500">(tú)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </td>
                  <td className={td}>
                    <div className="flex gap-1">
                      {u.rol === 'ADMIN' ? <Badge color="violet">Administrador</Badge> : <Badge>Equipo técnico</Badge>}
                      {!u.activo && <Badge color="red">Inactivo</Badge>}
                    </div>
                  </td>
                  <td className={`${td} text-slate-600`}>
                    {u.rol === 'ADMIN' ? (
                      <span className="text-xs text-slate-400">Todas</span>
                    ) : u.proyectosAsignados?.length ? (
                      <span className="text-xs">{u.proyectosAsignados.map((p) => p.proyecto.nombre).join(', ')}</span>
                    ) : (
                      <span className="text-xs text-amber-700">Sin proyectos asignados</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-xs text-slate-500`}>{formatFecha(u.creadoEn)}</td>
                  <td className={td}>
                    <div className="flex justify-end">
                      {u.activo ? (
                        <>
                          <IconButton label="Editar usuario" onClick={() => setModal({ usuario: u })}>
                            <Pencil className="size-4" />
                          </IconButton>
                          {u.id !== yo?.id && (
                            <IconButton
                              label="Desactivar usuario"
                              className="hover:text-red-600"
                              onClick={() =>
                                confirm({
                                  title: 'Desactivar usuario',
                                  message: `${u.nombre} ya no podrá iniciar sesión y perderá el acceso a sus proyectos. Sus planos, documentos y registros se conservan.`,
                                  confirmText: 'Desactivar',
                                  onConfirm: () => desactivar.mutateAsync(u.id),
                                })
                              }
                            >
                              <UserX className="size-4" />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => reactivar.mutate({ id: u.id, activo: true })}>
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

      <UsuarioModal state={modal} onClose={() => setModal(null)} esYo={modal?.usuario?.id === yo?.id} />
      {dialog}
    </>
  );
}

const schema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres'),
  email: z.string().trim().email('Correo inválido'),
  password: z.string().max(72).refine((v) => v === '' || v.length >= 8, 'Mínimo 8 caracteres'),
  rol: z.enum(['ADMIN', 'USUARIO']).optional(), // deshabilitado (undefined) al editarse a uno mismo
});
type FormData = z.infer<typeof schema>;

function UsuarioModal({ state, onClose, esYo }: { state: { usuario?: Usuario } | null; onClose: () => void; esYo: boolean }) {
  const usuario = state?.usuario;
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!state) return;
    reset(usuario ? { nombre: usuario.nombre, email: usuario.email, password: '', rol: usuario.rol } : { nombre: '', email: '', password: '', rol: 'USUARIO' });
  }, [state, usuario, reset]);

  const onSubmit = async ({ password, ...data }: FormData) => {
    if (usuario) {
      await actualizar.mutateAsync({ id: usuario.id, ...data, ...(password && { password }) });
    } else {
      if (!password) {
        setError('password', { message: 'La contraseña es obligatoria' });
        return;
      }
      await crear.mutateAsync({ ...data, rol: data.rol ?? 'USUARIO', password });
    }
    onClose();
  };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      title={usuario ? 'Editar usuario' : 'Nuevo usuario'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="usuario-form" loading={crear.isPending || actualizar.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="usuario-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Nombre completo" error={errors.nombre?.message} {...register('nombre')} />
        <Input label="Correo" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
        <Input
          label={usuario ? 'Nueva contraseña' : 'Contraseña'}
          type="password"
          autoComplete="new-password"
          hint={usuario ? 'Déjala en blanco para no cambiarla' : 'Mínimo 8 caracteres'}
          error={errors.password?.message}
          {...register('password')}
        />
        <Select label="Rol" disabled={esYo} hint={esYo ? 'No puedes cambiar tu propio rol' : undefined} error={errors.rol?.message} {...register('rol')}>
          <option value="USUARIO">Equipo técnico — ve sus proyectos, sube planos y elabora presupuestos</option>
          <option value="ADMIN">Administrador — acceso total</option>
        </Select>
      </form>
    </Modal>
  );
}
