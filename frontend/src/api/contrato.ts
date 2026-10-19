import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { useApiMutation } from './mutation';
import type {
  AmpliacionPlazo,
  Correspondencia,
  EstadoObservacion,
  ObservacionEntidad,
  PlazoProyecto,
  ResumenObservaciones,
  TipoCorrespondencia,
} from '@/types/api';

// Todo cuelga de ['contrato', proyectoId] (observaciones, correspondencia y plazo se relacionan entre sí)
const clave = (proyectoId: number, ...resto: unknown[]) => ['contrato', proyectoId, ...resto];
const invalidar = (proyectoId: number) => [clave(proyectoId), ['proyectos', proyectoId]];

// ---------- Observaciones ----------

export interface ObservacionInput {
  documento: string;
  fechaRecepcion: string;
  fechaLimite: string | null;
  descripcion: string;
  etapaId: number | null;
  responsableId: number | null;
  estado: EstadoObservacion;
  respuesta: string | null;
  fechaRespuesta: string | null;
  correspondenciaId: number | null;
}

export const useObservaciones = (proyectoId: number) =>
  useQuery({
    queryKey: clave(proyectoId, 'observaciones'),
    queryFn: async () => (await api.get<{ resumen: ResumenObservaciones; observaciones: ObservacionEntidad[] }>(`/proyectos/${proyectoId}/observaciones`)).data,
  });

export const useCrearObservacion = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: ObservacionInput) => (await api.post<ObservacionEntidad>(`/proyectos/${proyectoId}/observaciones`, data)).data,
    invalidate: invalidar(proyectoId),
    exito: (o) => `Observación N.° ${o.numero} registrada`,
  });

export const useActualizarObservacion = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<ObservacionInput> & { id: number }) => (await api.patch<ObservacionEntidad>(`/observaciones/${id}`, data)).data,
    invalidate: invalidar(proyectoId),
    exito: 'Observación actualizada',
  });

export const useEliminarObservacion = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/observaciones/${id}`);
    },
    invalidate: invalidar(proyectoId),
    exito: 'Observación eliminada',
  });

// ---------- Correspondencia ----------

export interface CorrespondenciaInput {
  tipo: TipoCorrespondencia;
  numero: string;
  fecha: string;
  asunto: string;
  entidad: string;
  referencia: string | null;
  respondeAId: number | null;
}

export const useCorrespondencia = (proyectoId: number, filtros: { tipo?: TipoCorrespondencia; q?: string } = {}) =>
  useQuery({
    queryKey: clave(proyectoId, 'correspondencia', filtros),
    queryFn: async () => (await api.get<Correspondencia[]>(`/proyectos/${proyectoId}/correspondencia`, { params: filtros })).data,
  });

export const useSiguienteNumeroCarta = (enabled: boolean) =>
  useQuery({
    queryKey: ['correspondencia', 'siguiente-numero'],
    queryFn: async () => (await api.get<{ sugerido: string }>('/correspondencia/siguiente-numero')).data.sugerido,
    enabled,
    staleTime: 0,
  });

export const useCrearCorrespondencia = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ archivo, ...data }: CorrespondenciaInput & { archivo?: File | null }) => {
      const form = new FormData();
      for (const [k, v] of Object.entries(data)) if (v !== null && v !== '') form.append(k, String(v));
      if (archivo) form.append('archivo', archivo);
      return (await api.post<Correspondencia>(`/proyectos/${proyectoId}/correspondencia`, form)).data;
    },
    invalidate: [...invalidar(proyectoId), ['correspondencia']],
    exito: 'Documento registrado',
  });

export const useActualizarCorrespondencia = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: Partial<CorrespondenciaInput> & { id: number }) => (await api.put<Correspondencia>(`/correspondencia/${id}`, data)).data,
    invalidate: invalidar(proyectoId),
    exito: 'Documento actualizado',
  });

export const useEliminarCorrespondencia = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/correspondencia/${id}`);
    },
    invalidate: invalidar(proyectoId),
    exito: 'Documento eliminado',
  });

// ---------- Plazo y ampliaciones ----------

export const usePlazo = (proyectoId: number) =>
  useQuery({
    queryKey: clave(proyectoId, 'plazo'),
    queryFn: async () => (await api.get<{ plazo: PlazoProyecto; ampliaciones: AmpliacionPlazo[] }>(`/proyectos/${proyectoId}/ampliaciones`)).data,
  });

export const useCrearAmpliacion = (proyectoId: number) =>
  useApiMutation({
    fn: async (data: { motivo: string; diasSolicitados: number; fechaSolicitud: string }) =>
      (await api.post<AmpliacionPlazo>(`/proyectos/${proyectoId}/ampliaciones`, data)).data,
    invalidate: invalidar(proyectoId),
    exito: 'Solicitud de ampliación registrada',
  });

export const useResolverAmpliacion = (proyectoId: number) =>
  useApiMutation({
    fn: async ({ id, ...data }: { id: number; estado: 'APROBADA' | 'DENEGADA'; diasAprobados?: number; fechaResolucion: string; documentoResolucion: string | null }) =>
      (await api.post<AmpliacionPlazo>(`/ampliaciones/${id}/resolver`, data)).data,
    invalidate: [...invalidar(proyectoId), ['proyectos'], ['dashboard']],
    exito: (a) => (a.estado === 'APROBADA' ? `Ampliación aprobada: la fecha de término se corrió ${a.diasAprobados} días` : 'Ampliación denegada'),
  });

export const useEliminarAmpliacion = (proyectoId: number) =>
  useApiMutation({
    fn: async (id: number) => {
      await api.delete(`/ampliaciones/${id}`);
    },
    invalidate: [...invalidar(proyectoId), ['proyectos']],
    exito: 'Ampliación eliminada',
  });
