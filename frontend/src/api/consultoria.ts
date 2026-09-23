import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import { keys } from './proyectos';
import type { Entregable, Especialidad, EstadoRevision, Partida, Plano, PlanoDetalle, PlanoVersion, Presupuesto, PresupuestoDetalle } from '@/types/api';

const ck = {
  planos: (p: number) => ['proyectos', p, 'planos'] as const,
  plano: (id: number) => ['planos', id] as const,
  presupuestos: (p: number) => ['proyectos', p, 'presupuestos'] as const,
  presupuesto: (id: number) => ['presupuestos', id] as const,
  entregables: (p: number) => ['proyectos', p, 'entregables'] as const,
};

// ---------------- Planos ----------------

export const usePlanos = (proyectoId: number, filtros: { especialidad?: Especialidad; estado?: EstadoRevision } = {}) =>
  useQuery({
    queryKey: [...ck.planos(proyectoId), filtros],
    queryFn: async () => (await api.get<Plano[]>(`/proyectos/${proyectoId}/planos`, { params: filtros })).data,
  });

export const usePlano = (id: number | null) =>
  useQuery({
    queryKey: ck.plano(id ?? 0),
    queryFn: async () => (await api.get<PlanoDetalle>(`/planos/${id}`)).data,
    enabled: !!id,
  });

export interface PlanoInput {
  codigo: string;
  titulo: string;
  especialidad: Especialidad;
  responsableId?: number;
  comentario?: string;
  archivo?: File | null;
}

const invalidarPlanos = (p: number) => [ck.planos(p), ['planos'], keys.dashboardProyecto(p), keys.dashboardGeneral];

export const useCrearPlano = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ archivo, ...data }: PlanoInput) => {
      const form = new FormData();
      Object.entries(data).forEach(([k, v]) => v !== undefined && v !== '' && form.append(k, String(v)));
      if (archivo) form.append('archivo', archivo);
      return (await api.post<Plano>(`/proyectos/${proyectoId}/planos`, form)).data;
    },
    invalidate: invalidarPlanos(proyectoId),
    exito: (p) => `Plano ${p.codigo} registrado`,
  });

export const useSubirVersion = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ planoId, archivo, comentario }: { planoId: number; archivo: File; comentario?: string }) => {
      const form = new FormData();
      if (comentario) form.append('comentario', comentario);
      form.append('archivo', archivo);
      return (await api.post<PlanoVersion>(`/planos/${planoId}/versiones`, form)).data;
    },
    invalidate: invalidarPlanos(proyectoId),
    exito: 'Nueva revisión subida y enviada a revisión',
  });

export const useActualizarPlano = (proyectoId: number) =>
  useApiMutation({
    fn: async ({
      id,
      ...data
    }: {
      id: number;
      codigo?: string;
      titulo?: string;
      especialidad?: Especialidad;
      responsableId?: number | null;
      estado?: EstadoRevision;
      observacion?: string | null;
    }) => (await api.patch<Plano>(`/planos/${id}`, data)).data,
    invalidate: invalidarPlanos(proyectoId),
    exito: 'Plano actualizado',
  });

export const useEliminarPlano = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/planos/${id}`);
    },
    invalidate: invalidarPlanos(proyectoId),
    exito: 'Plano eliminado',
  });

// ---------------- Presupuestos ----------------

export const usePresupuestos = (proyectoId: number) =>
  useQuery({
    queryKey: ck.presupuestos(proyectoId),
    queryFn: async () => (await api.get<Presupuesto[]>(`/proyectos/${proyectoId}/presupuestos`)).data,
  });

export const usePresupuesto = (id: number | null) =>
  useQuery({
    queryKey: ck.presupuesto(id ?? 0),
    queryFn: async () => (await api.get<PresupuestoDetalle>(`/presupuestos/${id}`)).data,
    enabled: !!id,
  });

export interface CabeceraPresupuesto {
  nombre?: string;
  gastosGeneralesPct?: number;
  utilidadPct?: number;
  igvPct?: number;
  observaciones?: string | null;
  estado?: EstadoRevision;
}

const invalidarPresupuestos = (p: number) => [ck.presupuestos(p), ['presupuestos'], keys.dashboardProyecto(p)];

export const useCrearPresupuesto = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { nombre: string }) => (await api.post<PresupuestoDetalle>(`/proyectos/${proyectoId}/presupuestos`, data)).data,
    invalidate: invalidarPresupuestos(proyectoId),
    exito: 'Presupuesto creado',
  });

export const useActualizarPresupuesto = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: CabeceraPresupuesto & { id: number }) => (await api.put<PresupuestoDetalle>(`/presupuestos/${id}`, data)).data,
    invalidate: invalidarPresupuestos(proyectoId),
  });

export const useGuardarPartidas = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, partidas }: { id: number; partidas: Partida[] }) =>
      (await api.put<PresupuestoDetalle>(`/presupuestos/${id}/partidas`, { partidas })).data,
    invalidate: invalidarPresupuestos(proyectoId),
  });

export const useDuplicarPresupuesto = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => (await api.post<PresupuestoDetalle>(`/presupuestos/${id}/duplicar`)).data,
    invalidate: invalidarPresupuestos(proyectoId),
    exito: (p) => `Versión ${p.version} creada`,
  });

export const useEliminarPresupuesto = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/presupuestos/${id}`);
    },
    invalidate: invalidarPresupuestos(proyectoId),
    exito: 'Presupuesto eliminado',
  });

// ---------------- Entregables ----------------

export const useEntregables = (proyectoId: number) =>
  useQuery({
    queryKey: ck.entregables(proyectoId),
    queryFn: async () => (await api.get<Entregable[]>(`/proyectos/${proyectoId}/entregables`)).data,
  });

export interface EntregableInput {
  nombre?: string;
  descripcion?: string | null;
  fechaLimite?: string | null;
  fechaEntrega?: string | null;
  responsableId?: number | null;
  estado?: EstadoRevision;
}

const invalidarEntregables = (p: number) => [ck.entregables(p), keys.dashboardProyecto(p), keys.dashboardGeneral];

export const useCrearEntregable = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: EntregableInput & { nombre: string }) => (await api.post<Entregable>(`/proyectos/${proyectoId}/entregables`, data)).data,
    invalidate: invalidarEntregables(proyectoId),
    exito: 'Entregable agregado',
  });

export const useAplicarPlantilla = (proyectoId: number) =>
  useApiMutation({
    fn: async () => (await api.post<{ agregados: number }>(`/proyectos/${proyectoId}/entregables/plantilla`)).data,
    invalidate: invalidarEntregables(proyectoId),
    exito: (r) => (r.agregados ? `Se agregaron ${r.agregados} entregables del expediente técnico` : 'El proyecto ya tiene todos los entregables estándar'),
  });

export const useActualizarEntregable = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: EntregableInput & { id: number }) => (await api.patch<Entregable>(`/entregables/${id}`, data)).data,
    invalidate: invalidarEntregables(proyectoId),
  });

export const useEliminarEntregable = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/entregables/${id}`);
    },
    invalidate: invalidarEntregables(proyectoId),
    exito: 'Entregable eliminado',
  });
