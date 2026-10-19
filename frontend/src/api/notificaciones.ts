import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string | null;
  enlace: string | null;
  leidaEn: string | null;
  creadoEn: string;
}

/** Número de la campana; se actualiza cada minuto */
export const useContadorNotificaciones = () =>
  useQuery({
    queryKey: ['notificaciones', 'contador'],
    queryFn: async () => (await api.get<{ noLeidas: number }>('/notificaciones/contador')).data.noLeidas,
    refetchInterval: 60_000,
  });

export const useNotificaciones = (enabled: boolean) =>
  useQuery({
    queryKey: ['notificaciones', 'lista'],
    queryFn: async () => (await api.get<{ noLeidas: number; notificaciones: Notificacion[] }>('/notificaciones', { params: { limite: 30 } })).data,
    enabled,
    staleTime: 0,
  });

// Sin toast: marcar como leída es una acción silenciosa
function useMarcar<T>(fn: (v: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificaciones'] }) });
}

export const useLeerNotificacion = () => useMarcar((id: number) => api.post(`/notificaciones/${id}/leer`));
export const useLeerTodas = () => useMarcar(() => api.post('/notificaciones/leer-todas'));
