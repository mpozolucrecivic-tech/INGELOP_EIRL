import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { useUsuarios } from '@/api/admin';
import { useAsignarUsuario, useDesasignarUsuario, useEliminarProyecto } from '@/api/proyectos';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, EmptyState } from '@/components/ui/Display';
import { Select } from '@/components/ui/Field';
import { useConfirm } from '@/components/ui/Modal';
import { formatFecha, formatSoles, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import type { ProyectoDetalle } from '@/types/api';
import { ProyectoFormModal } from '../ProyectoForm';

export default function AjustesTab({ proyecto }: { proyecto: ProyectoDetalle }) {
  const navigate = useNavigate();
  const [editando, setEditando] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const { data: usuarios = [] } = useUsuarios({ rol: 'USUARIO', activo: true });
  const asignar = useAsignarUsuario(proyecto.id);
  const desasignar = useDesasignarUsuario(proyecto.id);
  const eliminar = useEliminarProyecto();
  const { confirm, dialog } = useConfirm();

  const asignados = new Set(proyecto.usuarios.map((u) => u.id));
  const disponibles = usuarios.filter((u) => !asignados.has(u.id));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader
          title="Datos del proyecto"
          action={
            <Button size="sm" variant="secondary" icon={<Pencil className="size-4" />} onClick={() => setEditando(true)}>
              Editar
            </Button>
          }
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-5 text-sm">
          {[
            ['Cliente', proyecto.cliente.nombre],
            ['Servicio', TIPO_SERVICIO[proyecto.tipoServicio]],
            ['Rubro (OSCE)', RUBRO_OBRA[proyecto.rubro]],
            ['Ubicación', proyecto.ubicacion],
            ['Inicio', formatFecha(proyecto.fechaInicio)],
            ['Fin', formatFecha(proyecto.fechaFin)],
            ['Monto del contrato', formatSoles(proyecto.montoContrato)],
            ['Responsable', proyecto.responsable.nombre],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Usuarios con acceso" subtitle="Pueden ver el proyecto, subir planos, elaborar presupuestos y cargar documentos." />
        <div className="flex gap-2 border-b border-slate-100 px-5 py-3">
          <Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} wrapperClassName="flex-1" aria-label="Usuario a asignar">
            <option value="">{disponibles.length ? 'Selecciona un usuario…' : 'No hay más usuarios disponibles'}</option>
            {disponibles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.email})
              </option>
            ))}
          </Select>
          <Button
            icon={<UserPlus className="size-4" />}
            disabled={!usuarioId}
            loading={asignar.isPending}
            onClick={async () => {
              await asignar.mutateAsync(Number(usuarioId));
              setUsuarioId('');
            }}
          >
            Dar acceso
          </Button>
        </div>
        {proyecto.usuarios.length ? (
          <ul className="divide-y divide-slate-100">
            {proyecto.usuarios.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{u.nombre.charAt(0)}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{u.nombre}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <IconButton
                  label={`Quitar acceso a ${u.nombre}`}
                  className="hover:text-red-600"
                  onClick={() =>
                    confirm({
                      title: 'Quitar acceso',
                      message: `${u.nombre} dejará de ver este proyecto.`,
                      confirmText: 'Quitar acceso',
                      onConfirm: () => desasignar.mutateAsync(u.id),
                    })
                  }
                >
                  <X className="size-4" />
                </IconButton>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Sin usuarios asignados" description="Solo los administradores pueden ver este proyecto por ahora." />
        )}
      </Card>

      <Card className="border-red-200 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-semibold text-red-700">Eliminar proyecto</h3>
            <p className="mt-0.5 text-sm text-slate-600">Se borran planos, presupuestos, entregables, sprints, horas, gastos y documentos con sus archivos. No se puede deshacer.</p>
          </div>
          <Button
            variant="danger"
            icon={<Trash2 className="size-4" />}
            onClick={() =>
              confirm({
                title: 'Eliminar proyecto',
                message: `¿Eliminar definitivamente "${proyecto.nombre}" y todos sus datos?`,
                confirmText: 'Eliminar proyecto',
                onConfirm: async () => {
                  await eliminar.mutateAsync(proyecto.id);
                  navigate('/proyectos', { replace: true });
                },
              })
            }
          >
            Eliminar
          </Button>
        </div>
      </Card>

      <ProyectoFormModal open={editando} onClose={() => setEditando(false)} proyecto={proyecto} />
      {dialog}
    </div>
  );
}
