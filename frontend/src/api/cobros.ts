import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import type { CartaFianza, Cobro, EstadoCobro, EstadoGarantia, ResumenCobranzas, ResumenCobros, TipoGarantia } from '@/types/api';

// Todo lo de cobros cuelga de ['cobros'] y lo de cartas de ['cartas-fianza']: cualquier cambio refresca
// la pestaña del proyecto y la página de cobranzas
const INVALIDAR_COBROS = [['cobros']];
const INVALIDAR_CARTAS = [['cartas-fianza']];

export interface CobroInput {
  concepto: string;
  monto: number;
  detraccion: number;
  penalidad: number;
  fechaProgramada: string | null;
  comprobante: string | null;
  fechaEmision: string | null;
  fechaCobro: string | null;
  estado: EstadoCobro;
  observacion: string | null;
}

export interface CartaInput {
  tipo: TipoGarantia;
  numero: string;
  entidadFinanciera: string;
  monto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  observacion: string | null;
}

export const useCobrosProyecto = (proyectoId: number) =>
  useQuery({
    queryKey: ['cobros', 'proyecto', proyectoId],
    queryFn: async () => (await api.get<{ resumen: ResumenCobros; cobros: Cobro[] }>(`/proyectos/${proyectoId}/cobros`)).data,
  });

export const useCobranzas = (filtros: { estado?: EstadoCobro | 'PENDIENTES' }) =>
  useQuery({
    queryKey: ['cobros', 'todos', filtros],
    queryFn: async () => (await api.get<{ resumen: ResumenCobranzas; cobros: Cobro[] }>('/cobros', { params: filtros })).data,
  });

export const useCrearCobro = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: CobroInput) => (await api.post<Cobro>(`/proyectos/${proyectoId}/cobros`, data)).data,
    invalidate: INVALIDAR_COBROS,
    exito: 'Cobro registrado',
  });

export const useActualizarCobro = () =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<CobroInput> & { id: number }) => (await api.put<Cobro>(`/cobros/${id}`, data)).data,
    invalidate: INVALIDAR_COBROS,
    exito: 'Cobro actualizado',
  });

export const useEliminarCobro = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/cobros/${id}`);
    },
    invalidate: INVALIDAR_COBROS,
    exito: 'Cobro eliminado',
  });

export const useCartasProyecto = (proyectoId: number) =>
  useQuery({
    queryKey: ['cartas-fianza', 'proyecto', proyectoId],
    queryFn: async () => (await api.get<CartaFianza[]>(`/proyectos/${proyectoId}/cartas-fianza`)).data,
  });

export const useCartasFianza = (filtros: { estado?: EstadoGarantia }) =>
  useQuery({
    queryKey: ['cartas-fianza', 'todas', filtros],
    queryFn: async () => (await api.get<CartaFianza[]>('/cartas-fianza', { params: filtros })).data,
  });

export const useCrearCarta = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: CartaInput) => (await api.post<CartaFianza>(`/proyectos/${proyectoId}/cartas-fianza`, data)).data,
    invalidate: INVALIDAR_CARTAS,
    exito: 'Carta fianza registrada',
  });

export const useActualizarCarta = () =>
  useApiMutation({
    fn: async ({ id, ...data }: (Partial<CartaInput> & { estado?: Exclude<EstadoGarantia, 'RENOVADA'> }) & { id: number }) =>
      (await api.put<CartaFianza>(`/cartas-fianza/${id}`, data)).data,
    invalidate: INVALIDAR_CARTAS,
    exito: 'Carta fianza actualizada',
  });

export const useRenovarCarta = () =>
  useApiMutation({
    fn: async ({ id, ...data }: { id: number; numero: string; fechaEmision: string; fechaVencimiento: string; monto?: number; entidadFinanciera?: string }) =>
      (await api.post<CartaFianza>(`/cartas-fianza/${id}/renovar`, data)).data,
    invalidate: INVALIDAR_CARTAS,
    exito: 'Renovación registrada',
  });

export const useEliminarCarta = () =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/cartas-fianza/${id}`);
    },
    invalidate: INVALIDAR_CARTAS,
    exito: 'Carta fianza eliminada',
  });
