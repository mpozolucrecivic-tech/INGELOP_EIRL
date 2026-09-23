import { z } from 'zod';

const sprintBase = z.object({
  numero: z.coerce.number().int().positive().optional(), // si no se envía, se asigna el siguiente correlativo
  fechaInicio: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
  fechaFin: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
  objetivo: z.string().trim().min(3, 'Objetivo muy corto').max(500),
});

const fechasCoherentes = (d: { fechaInicio?: Date; fechaFin?: Date }) =>
  !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio;
const errorFechas = { message: 'fechaFin debe ser posterior o igual a fechaInicio', path: ['fechaFin'] };

export const crearSprintSchema = sprintBase.refine(fechasCoherentes, errorFechas);

export const actualizarSprintSchema = sprintBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' })
  .refine(fechasCoherentes, errorFechas);

export type CrearSprintInput = z.infer<typeof crearSprintSchema>;
export type ActualizarSprintInput = z.infer<typeof actualizarSprintSchema>;
