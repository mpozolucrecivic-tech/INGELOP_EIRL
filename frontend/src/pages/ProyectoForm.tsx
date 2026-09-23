import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClientes, useUsuarios } from '@/api/admin';
import { useActualizarProyecto, useCrearProyecto, type ProyectoInput } from '@/api/proyectos';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Display';
import { aInputFecha, ESTADO_PROYECTO, RUBRO_OBRA, TIPO_SERVICIO } from '@/lib/format';
import type { EstadoProyecto, Proyecto, RubroObra, TipoServicio } from '@/types/api';

const schema = z
  .object({
    nombre: z.string().trim().min(3, 'Mínimo 3 caracteres'),
    clienteId: z.number({ invalid_type_error: 'Selecciona un cliente', required_error: 'Selecciona un cliente' }),
    tipoServicio: z.enum(['ESTUDIO_PREINVERSION', 'EXPEDIENTE_TECNICO', 'DISENO_ARQUITECTONICO', 'DISENO_ESTRUCTURAL', 'SUPERVISION', 'LIQUIDACION_OBRA', 'CONSULTORIA', 'OTRO']),
    rubro: z.enum(['EDIFICACIONES', 'SANEAMIENTO', 'VIALES', 'ELECTROMECANICAS', 'REPRESAS_IRRIGACIONES']),
    ubicacion: z.string().trim().min(2, 'Requerido'),
    fechaInicio: z.string().min(1, 'Requerido'),
    fechaFin: z.string().min(1, 'Requerido'),
    montoContrato: z.number({ invalid_type_error: 'Ingresa un monto' }).positive('Debe ser mayor a 0'),
    estado: z.enum(['PLANIFICADA', 'EN_EJECUCION', 'FINALIZADA']),
    responsableId: z.number({ invalid_type_error: 'Selecciona un responsable', required_error: 'Selecciona un responsable' }),
  })
  .refine((d) => d.fechaFin >= d.fechaInicio, { message: 'Debe ser posterior al inicio', path: ['fechaFin'] });

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  proyecto?: Proyecto;
  onCreated?: (p: Proyecto) => void;
}

export function ProyectoFormModal({ open, onClose, proyecto, onCreated }: Props) {
  const crear = useCrearProyecto();
  const actualizar = useActualizarProyecto(proyecto?.id ?? 0);
  const usuariosQ = useUsuarios({ activo: true }, open);
  const clientesQ = useClientes({ activo: true }, open);
  const usuarios = usuariosQ.data ?? [];
  const clientes = clientesQ.data ?? [];
  // El formulario se monta cuando las listas están cargadas, así los selects muestran el valor guardado
  const listos = usuariosQ.isSuccess && clientesQ.isSuccess;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open) return;
    reset(
      proyecto
        ? {
            nombre: proyecto.nombre,
            clienteId: proyecto.clienteId,
            tipoServicio: proyecto.tipoServicio,
            rubro: proyecto.rubro,
            ubicacion: proyecto.ubicacion,
            fechaInicio: aInputFecha(proyecto.fechaInicio),
            fechaFin: aInputFecha(proyecto.fechaFin),
            montoContrato: proyecto.montoContrato,
            estado: proyecto.estado,
            responsableId: proyecto.responsableId,
          }
        : { estado: 'PLANIFICADA', tipoServicio: 'EXPEDIENTE_TECNICO', rubro: 'EDIFICACIONES' },
    );
  }, [open, proyecto, reset]);

  const onSubmit = async (data: FormData) => {
    const payload: ProyectoInput = data;
    if (proyecto) {
      await actualizar.mutateAsync(payload);
    } else {
      const creado = await crear.mutateAsync(payload);
      onCreated?.(creado);
    }
    onClose();
  };

  const pending = crear.isPending || actualizar.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="proyecto-form" loading={pending}>
            {proyecto ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
        </>
      }
    >
      {!listos ? (
        <Spinner />
      ) : (
      <form id="proyecto-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nombre del proyecto" wrapperClassName="sm:col-span-2" placeholder="Ej. Expediente técnico: Mejoramiento de la I.E. N° 10125" error={errors.nombre?.message} {...register('nombre')} />
        <Select
          label="Cliente"
          error={errors.clienteId?.message}
          hint={clientes.length ? undefined : 'Registra primero al cliente en la sección Clientes'}
          {...register('clienteId', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        >
          <option value="">Selecciona…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
        <Select label="Tipo de servicio" error={errors.tipoServicio?.message} {...register('tipoServicio')}>
          {(Object.keys(TIPO_SERVICIO) as TipoServicio[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_SERVICIO[t]}
            </option>
          ))}
        </Select>
        <Select label="Rubro (especialidad OSCE)" error={errors.rubro?.message} {...register('rubro')}>
          {(Object.keys(RUBRO_OBRA) as RubroObra[]).map((r) => (
            <option key={r} value={r}>
              {RUBRO_OBRA[r]}
            </option>
          ))}
        </Select>
        <Input label="Ubicación" placeholder="Ej. La Victoria, Chiclayo" error={errors.ubicacion?.message} {...register('ubicacion')} />
        <Input label="Fecha de inicio" type="date" error={errors.fechaInicio?.message} {...register('fechaInicio')} />
        <Input label="Fecha de fin" type="date" error={errors.fechaFin?.message} {...register('fechaFin')} />
        <Input
          label="Monto del contrato (S/)"
          type="number"
          step="0.01"
          min="0"
          hint="Honorarios pactados con el cliente"
          error={errors.montoContrato?.message}
          {...register('montoContrato', { valueAsNumber: true })}
        />
        <Select label="Estado" error={errors.estado?.message} {...register('estado')}>
          {(Object.keys(ESTADO_PROYECTO) as EstadoProyecto[]).map((e) => (
            <option key={e} value={e}>
              {ESTADO_PROYECTO[e].label}
            </option>
          ))}
        </Select>
        <Select
          label="Responsable"
          wrapperClassName="sm:col-span-2"
          error={errors.responsableId?.message}
          {...register('responsableId', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })}
        >
          <option value="">Selecciona…</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre} {u.rol === 'ADMIN' ? '(Admin)' : ''}
            </option>
          ))}
        </Select>
      </form>
      )}
    </Modal>
  );
}
