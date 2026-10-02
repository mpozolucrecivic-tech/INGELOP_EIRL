import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import type { Cliente, MensajeContacto, Rol, Servicio, TipoCliente, TipoMensaje, Trabajador, Usuario } from '@/types/api';

// ---------- Usuarios ----------

export interface UsuarioInput {
  nombre: string;
  email: string;
  password?: string;
  rol: Rol;
  activo?: boolean;
}

export const useUsuarios = (filtros: { rol?: Rol; activo?: boolean } = {}, enabled = true) =>
  useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: async () => (await api.get<Usuario[]>('/usuarios', { params: filtros })).data,
    enabled,
  });

export const useCrearUsuario = () =>
  useApiMutation({
    fn: async (data: UsuarioInput) => (await api.post<Usuario>('/usuarios', data)).data,
    invalidate: [['usuarios']],
    exito: 'Usuario creado',
  });

export const useActualizarUsuario = () =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<UsuarioInput> & { id: number }) => (await api.put<Usuario>(`/usuarios/${id}`, data)).data,
    invalidate: [['usuarios']],
    exito: 'Usuario actualizado',
  });

export const useDesactivarUsuario = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/usuarios/${id}`);
    },
    invalidate: [['usuarios'], ['proyectos']],
    exito: 'Usuario desactivado',
  });

// ---------- Clientes ----------

export interface ClienteInput {
  tipo: TipoCliente;
  nombre: string;
  documento?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  activo?: boolean;
}

export const useClientes = (filtros: { q?: string; activo?: boolean } = {}, enabled = true) =>
  useQuery({
    queryKey: ['clientes', filtros],
    queryFn: async () => (await api.get<Cliente[]>('/clientes', { params: filtros })).data,
    enabled,
  });

export const useCrearCliente = () =>
  useApiMutation({
    fn: async (data: ClienteInput) => (await api.post<Cliente>('/clientes', data)).data,
    invalidate: [['clientes']],
    exito: 'Cliente registrado',
  });

export const useActualizarCliente = () =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<ClienteInput> & { id: number }) => (await api.put<Cliente>(`/clientes/${id}`, data)).data,
    invalidate: [['clientes'], ['proyectos']],
    exito: 'Cliente actualizado',
  });

export const useEliminarCliente = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/clientes/${id}`);
    },
    invalidate: [['clientes']],
    exito: 'Cliente eliminado',
  });

// ---------- Trabajadores ----------

export interface TrabajadorInput {
  dni: string;
  nombre: string;
  cargo: string;
  costoHora: number;
  activo?: boolean;
}

export const useTrabajadores = (filtros: { activo?: boolean; q?: string } = {}, enabled = true) =>
  useQuery({
    queryKey: ['trabajadores', filtros],
    queryFn: async () => (await api.get<Trabajador[]>('/trabajadores', { params: filtros })).data,
    enabled,
  });

export const useCrearTrabajador = () =>
  useApiMutation({
    fn: async (data: TrabajadorInput) => (await api.post<Trabajador>('/trabajadores', data)).data,
    invalidate: [['trabajadores']],
    exito: 'Trabajador registrado',
  });

export const useActualizarTrabajador = () =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<TrabajadorInput> & { id: number }) =>
      (await api.put<Trabajador>(`/trabajadores/${id}`, data)).data,
    invalidate: [['trabajadores']],
    exito: 'Trabajador actualizado',
  });

// ---------- Servicios de la web ----------

export interface ServicioInput {
  nombre: string;
  descripcion: string;
  slug?: string | null;
  icono?: string | null;
  items?: string[];
  orden?: number;
  activo?: boolean;
}

export const useServicios = () =>
  useQuery({
    queryKey: ['servicios'],
    queryFn: async () => (await api.get<Servicio[]>('/servicios/todos')).data,
  });

export const useCrearServicio = () =>
  useApiMutation({
    fn: async (data: ServicioInput) => (await api.post<Servicio>('/servicios', data)).data,
    invalidate: [['servicios']],
    exito: 'Servicio creado',
  });

export const useActualizarServicio = () =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<ServicioInput> & { id: number }) => (await api.put<Servicio>(`/servicios/${id}`, data)).data,
    invalidate: [['servicios']],
    exito: 'Servicio actualizado',
  });

export const useDesactivarServicio = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/servicios/${id}`);
    },
    invalidate: [['servicios']],
    exito: 'Servicio ocultado de la web',
  });

export const useSubirFotoServicio = () =>
  useApiMutation({
    fn: async ({ id, archivo }: { id: number; archivo: File }) => {
      const form = new FormData();
      form.append('archivo', archivo);
      return (await api.post<Servicio>(`/servicios/${id}/foto`, form)).data;
    },
    invalidate: [['servicios']],
    exito: 'Foto actualizada',
  });

export const useQuitarFotoServicio = () =>
  useApiMutation({
    fn: async (id: number) => (await api.delete<Servicio>(`/servicios/${id}/foto`)).data,
    invalidate: [['servicios']],
    exito: 'Foto quitada: la web mostrará el ícono',
  });

// ---------- Mensajes del formulario de contacto ----------

export const useMensajes = (filtros: { tipo?: TipoMensaje; leido?: boolean; q?: string } = {}, enabled = true) =>
  useQuery({
    queryKey: ['mensajes', filtros],
    queryFn: async () => (await api.get<MensajeContacto[]>('/contacto', { params: filtros })).data,
    enabled,
  });

/** Cantidad de mensajes sin leer (para el menú); se actualiza cada minuto */
export const useMensajesSinLeer = (enabled = true) =>
  useQuery({
    queryKey: ['mensajes', { leido: false }],
    queryFn: async () => (await api.get<MensajeContacto[]>('/contacto', { params: { leido: false } })).data,
    select: (mensajes) => mensajes.length,
    refetchInterval: 60_000,
    enabled,
  });

export const useMarcarLeido = () =>
  useApiMutation({
    fn: async ({ id, leido }: { id: number; leido: boolean }) => (await api.patch<MensajeContacto>(`/contacto/${id}/leido`, { leido })).data,
    invalidate: [['mensajes']],
  });
