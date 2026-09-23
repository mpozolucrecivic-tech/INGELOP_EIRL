import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import { keys } from './proyectos';
import type {
  Asignacion,
  CategoriaGasto,
  Evidencia,
  Gasto,
  Material,
  Movimiento,
  RegistroHoras,
  ResumenGastos,
  ResumenHoras,
  TipoEvidencia,
  TipoMovimiento,
} from '@/types/api';

const rk = {
  materiales: (p: number) => ['proyectos', p, 'materiales'] as const,
  alertas: (p: number) => ['proyectos', p, 'materiales', 'alertas'] as const,
  movimientos: (m: number) => ['materiales', m, 'movimientos'] as const,
  asignaciones: (p: number) => ['proyectos', p, 'asignaciones'] as const,
  registros: (p: number) => ['proyectos', p, 'registros-horas'] as const,
  horas: (p: number) => ['proyectos', p, 'horas'] as const,
  gastos: (p: number) => ['proyectos', p, 'gastos'] as const,
  resumenGastos: (p: number) => ['proyectos', p, 'gastos', 'resumen'] as const,
  evidencias: (p: number) => ['proyectos', p, 'evidencias'] as const,
};

type RangoFechas = { desde?: string; hasta?: string };

// ---------- Materiales ----------

export const useMateriales = (proyectoId: number, enabled = true) =>
  useQuery({
    queryKey: rk.materiales(proyectoId),
    queryFn: async () => (await api.get<Material[]>(`/proyectos/${proyectoId}/materiales`)).data,
    enabled,
  });

export const useAlertasMateriales = (proyectoId: number) =>
  useQuery({
    queryKey: rk.alertas(proyectoId),
    queryFn: async () => (await api.get<Material[]>(`/proyectos/${proyectoId}/materiales/alertas`)).data,
  });

export const useCrearMaterial = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { nombre: string; unidad: string; stockMinimo: number; stockInicial?: number }) =>
      (await api.post<Material>(`/proyectos/${proyectoId}/materiales`, data)).data,
    invalidate: [rk.materiales(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Material registrado',
  });

export const useActualizarMaterial = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: { id: number; nombre?: string; unidad?: string; stockMinimo?: number }) =>
      (await api.put<Material>(`/materiales/${id}`, data)).data,
    invalidate: [rk.materiales(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Material actualizado',
  });

export const useMovimientos = (materialId: number | null) =>
  useQuery({
    queryKey: rk.movimientos(materialId ?? 0),
    queryFn: async () => (await api.get<Movimiento[]>(`/materiales/${materialId}/movimientos`)).data,
    enabled: !!materialId,
  });

export const useRegistrarMovimiento = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ materialId, ...data }: { materialId: number; tipo: TipoMovimiento; cantidad: number; observacion?: string }) =>
      (await api.post<{ material: Material }>(`/materiales/${materialId}/movimientos`, data)).data,
    invalidate: [rk.materiales(proyectoId), ['materiales'], keys.dashboardProyecto(proyectoId), keys.dashboardGeneral],
    exito: 'Movimiento registrado',
  });

// ---------- Personal ----------

export const useAsignaciones = (proyectoId: number, enabled = true) =>
  useQuery({
    queryKey: rk.asignaciones(proyectoId),
    queryFn: async () => (await api.get<Asignacion[]>(`/proyectos/${proyectoId}/asignaciones`)).data,
    enabled,
  });

export const useCrearAsignacion = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { trabajadorId: number; fechaInicio: string; fechaFin?: string }) =>
      (await api.post<Asignacion>(`/proyectos/${proyectoId}/asignaciones`, data)).data,
    invalidate: [rk.asignaciones(proyectoId), ['trabajadores'], keys.dashboardProyecto(proyectoId)],
    exito: 'Trabajador asignado a la obra',
  });

export const useCerrarAsignacion = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, fechaFin }: { id: number; fechaFin: string }) => (await api.patch(`/asignaciones/${id}`, { fechaFin })).data,
    invalidate: [rk.asignaciones(proyectoId), ['trabajadores'], keys.dashboardProyecto(proyectoId)],
    exito: 'Asignación cerrada',
  });

export const useRegistrosHoras = (proyectoId: number, filtros: RangoFechas & { trabajadorId?: number }, enabled = true) =>
  useQuery({
    queryKey: [...rk.registros(proyectoId), filtros],
    queryFn: async () => (await api.get<RegistroHoras[]>(`/proyectos/${proyectoId}/registros-horas`, { params: filtros })).data,
    enabled,
  });

export const useRegistrarHoras = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { trabajadorId: number; fecha: string; horas: number; descripcion?: string }) =>
      (await api.post<RegistroHoras>(`/proyectos/${proyectoId}/registros-horas`, data)).data,
    invalidate: [rk.registros(proyectoId), rk.horas(proyectoId), keys.dashboardProyecto(proyectoId), keys.dashboardGeneral],
    exito: 'Horas registradas',
  });

export const useEliminarRegistroHoras = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/registros-horas/${id}`);
    },
    invalidate: [rk.registros(proyectoId), rk.horas(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Registro eliminado',
  });

export const useResumenHoras = (proyectoId: number, rango: RangoFechas) =>
  useQuery({
    queryKey: [...rk.horas(proyectoId), rango],
    queryFn: async () => (await api.get<ResumenHoras>(`/proyectos/${proyectoId}/horas`, { params: rango })).data,
  });

// ---------- Gastos ----------

export interface GastoInput {
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  fecha: string;
}

export const useGastos = (proyectoId: number, filtros: RangoFechas & { categoria?: CategoriaGasto }, enabled = true) =>
  useQuery({
    queryKey: [...rk.gastos(proyectoId), 'lista', filtros],
    queryFn: async () => (await api.get<Gasto[]>(`/proyectos/${proyectoId}/gastos`, { params: filtros })).data,
    enabled,
  });

export const useResumenGastos = (proyectoId: number) =>
  useQuery({
    queryKey: rk.resumenGastos(proyectoId),
    queryFn: async () => (await api.get<ResumenGastos>(`/proyectos/${proyectoId}/gastos/resumen`)).data,
  });

const invalidarGastos = (p: number) => [rk.gastos(p), keys.dashboardProyecto(p), keys.dashboardGeneral];

export const useCrearGasto = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: GastoInput) => (await api.post<Gasto>(`/proyectos/${proyectoId}/gastos`, data)).data,
    invalidate: invalidarGastos(proyectoId),
    exito: 'Gasto registrado',
  });

export const useActualizarGasto = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<GastoInput> & { id: number }) => (await api.put<Gasto>(`/gastos/${id}`, data)).data,
    invalidate: invalidarGastos(proyectoId),
    exito: 'Gasto actualizado',
  });

export const useEliminarGasto = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/gastos/${id}`);
    },
    invalidate: invalidarGastos(proyectoId),
    exito: 'Gasto eliminado',
  });

// ---------- Evidencias ----------

export const useEvidencias = (proyectoId: number, filtros: { tipo?: TipoEvidencia } = {}) =>
  useQuery({
    queryKey: [...rk.evidencias(proyectoId), filtros],
    queryFn: async () => (await api.get<Evidencia[]>(`/proyectos/${proyectoId}/evidencias`, { params: filtros })).data,
  });

export interface EvidenciaInput {
  tipo: TipoEvidencia;
  titulo: string;
  descripcion?: string;
  actividadId?: number;
  archivo?: File | null;
}

export const useCrearEvidencia = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: EvidenciaInput) => {
      const form = new FormData();
      form.append('tipo', data.tipo);
      form.append('titulo', data.titulo);
      if (data.descripcion) form.append('descripcion', data.descripcion);
      if (data.actividadId) form.append('actividadId', String(data.actividadId));
      if (data.archivo) form.append('archivo', data.archivo);
      return (await api.post<Evidencia>(`/proyectos/${proyectoId}/evidencias`, form)).data;
    },
    invalidate: [rk.evidencias(proyectoId), keys.dashboardProyecto(proyectoId), ['sprints']],
    exito: 'Evidencia subida',
  });

export const useEliminarEvidencia = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/evidencias/${id}`);
    },
    invalidate: [rk.evidencias(proyectoId), keys.dashboardProyecto(proyectoId)],
    exito: 'Evidencia eliminada',
  });
