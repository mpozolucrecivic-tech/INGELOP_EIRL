import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { mensajeError } from './client';

interface Opciones<TVars, TData> {
  fn: (vars: TVars) => Promise<TData>;
  /** Queries a refrescar al terminar bien (prefijos de queryKey) */
  invalidate?: QueryKey[];
  /** Mensaje de éxito (toast). Omitir para no mostrar nada. */
  exito?: string | ((data: TData) => string);
}

/** Mutación estándar: muestra toast de éxito/error e invalida las queries relacionadas */
export function useApiMutation<TVars = void, TData = unknown>({ fn, invalidate = [], exito }: Opciones<TVars, TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (data) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (exito) toast.success(typeof exito === 'function' ? exito(data) : exito);
    },
    onError: (error) => {
      toast.error(mensajeError(error));
    },
  });
}
