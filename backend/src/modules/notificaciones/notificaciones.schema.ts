import { z } from 'zod';

export const listarNotificacionesQuery = z.object({
  soloNoLeidas: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limite: z.coerce.number().int().min(1).max(100).default(30),
});

export type ListarNotificacionesQuery = z.infer<typeof listarNotificacionesQuery>;
