import { z } from 'zod';

/** Params con un único :id numérico */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Convierte '' y null en undefined (útil para campos opcionales de formularios / multipart) */
export const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** Monto o cantidad no negativa con máximo 2 decimales */
export const decimal = z.coerce
  .number({ invalid_type_error: 'Debe ser un número' })
  .nonnegative('No puede ser negativo')
  .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, { message: 'Máximo 2 decimales' });

/** Rango de fechas opcional para filtros (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD) */
export const rangoFechasQuery = z
  .object({
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
  })
  .refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, {
    message: '"desde" debe ser anterior o igual a "hasta"',
    path: ['hasta'],
  });

export type IdParam = z.infer<typeof idParamSchema>;
