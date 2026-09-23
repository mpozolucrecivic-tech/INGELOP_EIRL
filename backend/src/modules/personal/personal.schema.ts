import { z } from 'zod';
import { decimal, rangoFechasQuery } from '../../utils/schemas';

const trabajadorBase = z.object({
  dni: z.string().trim().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos'),
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(200),
  cargo: z.string().trim().min(2).max(100), // ej. Arquitecto, Ing. Civil, Ing. Sanitario, Dibujante CAD
  costoHora: decimal.refine((n) => n < 1_000_000, { message: 'costoHora fuera de rango' }),
});

export const crearTrabajadorSchema = trabajadorBase;

export const actualizarTrabajadorSchema = trabajadorBase
  .extend({ activo: z.boolean() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarTrabajadoresQuery = z.object({
  activo: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().min(1).optional(),
});

export const crearAsignacionSchema = z
  .object({
    trabajadorId: z.coerce.number().int().positive(),
    fechaInicio: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
    fechaFin: z.coerce.date({ invalid_type_error: 'Fecha inválida' }).optional(),
  })
  .refine((d) => !d.fechaFin || d.fechaFin >= d.fechaInicio, {
    message: 'fechaFin debe ser posterior o igual a fechaInicio',
    path: ['fechaFin'],
  });

export const cerrarAsignacionSchema = z.object({
  fechaFin: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
});

export const crearRegistroHorasSchema = z.object({
  trabajadorId: z.coerce.number().int().positive(),
  fecha: z.coerce.date({ invalid_type_error: 'Fecha inválida (use YYYY-MM-DD)' }),
  horas: z.coerce
    .number()
    .positive('Debe ser mayor a 0')
    .max(24, 'Máximo 24 horas por día')
    .multipleOf(0.5, 'Use múltiplos de 0.5 horas'),
  descripcion: z.string().trim().max(300).optional(), // tarea realizada
});

export const listarRegistrosQuery = rangoFechasQuery.and(
  z.object({ trabajadorId: z.coerce.number().int().positive().optional() }),
);

export type CrearTrabajadorInput = z.infer<typeof crearTrabajadorSchema>;
export type ActualizarTrabajadorInput = z.infer<typeof actualizarTrabajadorSchema>;
export type ListarTrabajadoresQuery = z.infer<typeof listarTrabajadoresQuery>;
export type CrearAsignacionInput = z.infer<typeof crearAsignacionSchema>;
export type CrearRegistroHorasInput = z.infer<typeof crearRegistroHorasSchema>;
export type ListarRegistrosQuery = z.infer<typeof listarRegistrosQuery>;
