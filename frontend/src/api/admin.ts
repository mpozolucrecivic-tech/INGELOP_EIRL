import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import type { Cliente, Rol, TipoCliente, Trabajador, Usuario } from '@/types/api';

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
