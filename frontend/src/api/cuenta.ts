import { useMutation, useQuery } from '@tanstack/react-query';
import { api, tokenStorage } from './client';

/** Público: si el servidor puede enviar el enlace de "olvidé mi contraseña" */
export const useOpcionesAuth = () =>
  useQuery({
    queryKey: ['auth', 'opciones'],
    queryFn: async () => (await api.get<{ recuperacionContrasena: boolean }>('/auth/opciones')).data,
    staleTime: 5 * 60_000,
  });

// Sin toast automático: los formularios muestran los errores en sus campos

/** Cambio desde "Mi cuenta": guarda el token nuevo (el anterior deja de valer) */
export const useCambiarContrasena = () =>
  useMutation({
    mutationFn: async (body: { actual: string; nueva: string }) => {
      const { data } = await api.post<{ token: string; message: string }>('/auth/cambiar-contrasena', body);
      tokenStorage.set(data.token);
      return data;
    },
  });

export const useSolicitarRecuperacion = () =>
  useMutation({
    mutationFn: async (email: string) => (await api.post<{ message: string }>('/auth/recuperar-contrasena', { email })).data,
  });

export const useRestablecerContrasena = () =>
  useMutation({
    mutationFn: async (body: { token: string; nueva: string }) => (await api.post<{ message: string }>('/auth/restablecer-contrasena', body)).data,
  });
