import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import type {
  Actividad,
  DashboardGeneral,
  DashboardProyecto,
  EstadoActividad,
  EstadoProyecto,
  Proyecto,
  ProyectoDetalle,
  RubroObra,
  Sprint,
  TipoServicio,
  Usuario,
} from '@/types/api';

export const keys = {
  proyectos: ['proyectos'] as const,
  proyecto: (id: number) => ['proyectos', id] as const,
  usuariosProyecto: (id: number) => ['proyectos', id, 'usuarios'] as const,
  sprints: (proyectoId: number) => ['proyectos', proyectoId, 'sprints'] as const,
  actividades: (sprintId: number) => ['sprints', sprintId, 'actividades'] as const,
  dashboardProyecto: (id: number) => ['proyectos', id, 'dashboard'] as const,
  dashboardGeneral: ['dashboard', 'general'] as const,
};

// ---------- Proyectos ----------

export interface ProyectoInput {
  nombre: string;
  clienteId: number;
  tipoServicio: TipoServicio;
  rubro: RubroObra;
  ubicacion: string;
  fechaInicio: string;
  fechaFin: string;
  montoContrato: number;
  estado: EstadoProyecto;
  responsableId: number;
}

export const useProyectos = (filtros: { estado?: EstadoProyecto; rubro?: RubroObra; q?: string } = {}) =>
  useQuery({
    queryKey: [...keys.proyectos, filtros],
    queryFn: async () => (await api.get<Proyecto[]>('/proyectos', { params: filtros })).data,
  });

export const useProyecto = (id: number) =>
  useQuery({
    queryKey: keys.proyecto(id),
    queryFn: async () => (await api.get<ProyectoDetalle>(`/proyectos/${id}`)).data,
  });

export const useCrearProyecto = () =>
  useApiMutation({
    fn: async (data: ProyectoInput) => (await api.post<Proyecto>('/proyectos', data)).data,
    invalidate: [keys.proyectos, keys.dashboardGeneral],
    exito: 'Proyecto creado',
  });

export const useActualizarProyecto = (id: number) =>
  useApiMutation({
    fn: async (data: Partial<ProyectoInput>) => (await api.put<Proyecto>(`/proyectos/${id}`, data)).data,
    invalidate: [keys.proyectos, keys.dashboardGeneral],
    exito: 'Proyecto actualizado',
  });

export const useEliminarProyecto = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/proyectos/${id}`);
    },
    invalidate: [keys.proyectos, keys.dashboardGeneral],
    exito: 'Proyecto eliminado',
  });

export const useUsuariosProyecto = (id: number, enabled = true) =>
  useQuery({
    queryKey: keys.usuariosProyecto(id),
    queryFn: async () => (await api.get<Pick<Usuario, 'id' | 'nombre' | 'email' | 'rol' | 'activo'>[]>(`/proyectos/${id}/usuarios`)).data,
    enabled,
  });

export const useAsignarUsuario = (proyectoId: number) =>
  useApiMutation({
    fn: async (usuarioId: number) => (await api.post(`/proyectos/${proyectoId}/usuarios`, { usuarioId })).data,
    invalidate: [keys.proyecto(proyectoId), ['usuarios']],
    exito: 'Usuario asignado a la obra',
  });

export const useDesasignarUsuario = (proyectoId: number) =>
  useApiMutation({
    fn: async (usuarioId: number) => {
      await api.delete(`/proyectos/${proyectoId}/usuarios/${usuarioId}`);
    },
    invalidate: [keys.proyecto(proyectoId), ['usuarios']],
    exito: 'Usuario retirado de la obra',
  });

// ---------- Sprints ----------

export interface SprintInput {
  numero?: number;
  fechaInicio: string;
  fechaFin: string;
  objetivo: string;
}

export const useSprints = (proyectoId: number) =>
  useQuery({
    queryKey: keys.sprints(proyectoId),
    queryFn: async () => (await api.get<Sprint[]>(`/proyectos/${proyectoId}/sprints`)).data,
  });

export const useCrearSprint = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: SprintInput) => (await api.post<Sprint>(`/proyectos/${proyectoId}/sprints`, data)).data,
    invalidate: [keys.sprints(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: (s) => `Sprint ${s.numero} creado`,
  });

export const useActualizarSprint = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<SprintInput> & { id: number }) => (await api.put<Sprint>(`/sprints/${id}`, data)).data,
    invalidate: [keys.sprints(proyectoId)],
    exito: 'Sprint actualizado',
  });

export const useEliminarSprint = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/sprints/${id}`);
    },
    invalidate: [keys.sprints(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Sprint eliminado',
  });

// ---------- Actividades ----------

export interface ActividadInput {
  nombre: string;
  responsableId: number;
  estado?: EstadoActividad;
  avance?: number;
  sprintId?: number;
}

export const useActividades = (sprintId: number | null) =>
  useQuery({
    queryKey: keys.actividades(sprintId ?? 0),
    queryFn: async () => (await api.get<Actividad[]>(`/sprints/${sprintId}/actividades`)).data,
    enabled: !!sprintId,
  });

export const useCrearActividad = (proyectoId: number, sprintId: number) =>
  useApiMutation({
    fn: async (data: ActividadInput) => (await api.post<Actividad>(`/sprints/${sprintId}/actividades`, data)).data,
    invalidate: [keys.actividades(sprintId), keys.sprints(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Actividad creada',
  });

export const useActualizarActividad = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<ActividadInput> & { id: number }) =>
      (await api.patch<Actividad>(`/actividades/${id}`, data)).data,
    invalidate: [['sprints'], keys.sprints(proyectoId), keys.dashboardProyecto(proyectoId)],
  });

export const useEliminarActividad = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/actividades/${id}`);
    },
    invalidate: [['sprints'], keys.sprints(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Actividad eliminada',
  });

// ---------- Dashboard ----------

export const useDashboardProyecto = (id: number) =>
  useQuery({
    queryKey: keys.dashboardProyecto(id),
    queryFn: async () => (await api.get<DashboardProyecto>(`/proyectos/${id}/dashboard`)).data,
  });

export const useDashboardGeneral = (meses = 12) =>
  useQuery({
    queryKey: [...keys.dashboardGeneral, meses],
    queryFn: async () => (await api.get<DashboardGeneral>('/dashboard/general', { params: { meses } })).data,
  });
