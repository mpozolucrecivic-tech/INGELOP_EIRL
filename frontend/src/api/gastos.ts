import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import { keys } from './proyectos';
import type { CategoriaGasto, Gasto, ImportacionGasto, ResumenGastosEmpresa } from '@/types/api';

type Filtros = { desde?: string; hasta?: string; categoria?: CategoriaGasto };

export const gk = {
  gastosProyecto: (p: number) => ['proyectos', p, 'gastos'] as const,
  empresa: ['gastos-empresa'] as const,
  importaciones: ['importaciones-gasto'] as const,
};

/** Qué refrescar al cambiar un gasto: el de un proyecto (número) o el de la empresa (null) */
export const invalidarGastosDe = (proyectoId: number | null) =>
  proyectoId === null ? [gk.empresa, keys.dashboardGeneral] : [gk.gastosProyecto(proyectoId), keys.dashboardProyecto(proyectoId), keys.dashboardGeneral];

// ---------- Gastos de la empresa ----------

export const useGastosEmpresa = (filtros: Filtros) =>
  useQuery({
    queryKey: [...gk.empresa, 'lista', filtros],
    queryFn: async () => (await api.get<Gasto[]>('/gastos/empresa', { params: filtros })).data,
  });

export const useResumenGastosEmpresa = (filtros: Pick<Filtros, 'desde' | 'hasta'>) =>
  useQuery({
    queryKey: [...gk.empresa, 'resumen', filtros],
    queryFn: async () => (await api.get<ResumenGastosEmpresa>('/gastos/empresa/resumen', { params: filtros })).data,
  });

export const useCrearGastoEmpresa = () =>
  useApiMutation({
    fn: async (data: { categoria: CategoriaGasto; descripcion: string; monto: number; fecha: string }) =>
      (await api.post<Gasto>('/gastos/empresa', data)).data,
    invalidate: invalidarGastosDe(null),
    exito: 'Gasto registrado',
  });

// ---------- Importación desde Excel ----------

export interface FilaAImportar {
  fila: number;
  proyectoId: number | null;
  categoria: CategoriaGasto;
  descripcion: string;
  monto: number;
  fecha: string; // YYYY-MM-DD
}

export interface VerificacionFila {
  fila: number;
  duplicado: 'EXISTE' | 'ARCHIVO' | null;
  gastoId: number | null;
}

export const verificarImportacion = async (filas: FilaAImportar[]) =>
  (await api.post<VerificacionFila[]>('/gastos/importar/verificar', { filas })).data;

// Una importación puede repartir gastos en varios proyectos y en la empresa: se refresca todo lo de gastos
const invalidarImportacion = [keys.proyectos, gk.empresa, gk.importaciones, keys.dashboardGeneral];

export const useImportarGastos = () =>
  useApiMutation({
    fn: async (data: { nombreArchivo: string; origenProyectoId: number | null; filas: FilaAImportar[] }) =>
      (await api.post<ImportacionGasto>('/gastos/importar', data)).data,
    invalidate: invalidarImportacion,
    exito: (i) => `${i.cantidad} ${i.cantidad === 1 ? 'gasto importado' : 'gastos importados'}`,
  });

/** proyectoId undefined = importaciones hechas desde "Gastos de la empresa" */
export const useImportaciones = (proyectoId?: number) =>
  useQuery({
    queryKey: [...gk.importaciones, proyectoId ?? 'empresa'],
    queryFn: async () => (await api.get<ImportacionGasto[]>('/gastos/importaciones', { params: { proyectoId } })).data,
  });

export const useDeshacerImportacion = () =>
  useApiMutation({
    fn: async (id: number) => (await api.delete<{ gastosEliminados: number }>(`/gastos/importaciones/${id}`)).data,
    invalidate: invalidarImportacion,
    exito: (r) => `Importación deshecha: ${r.gastosEliminados} ${r.gastosEliminados === 1 ? 'gasto eliminado' : 'gastos eliminados'}`,
  });
