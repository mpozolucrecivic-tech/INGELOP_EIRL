import { z } from 'zod';
import { EstadoRevision } from '@prisma/client';

const base = z.object({
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(200),
  descripcion: z.string().trim().max(1000).nullable().optional(),
  fechaLimite: z.coerce.date({ invalid_type_error: 'Fecha inválida' }).nullable().optional(),
  responsableId: z.coerce.number().int().positive().nullable().optional(),
});

export const crearEntregableSchema = base;

export const actualizarEntregableSchema = base
  .extend({
    estado: z.nativeEnum(EstadoRevision),
    fechaEntrega: z.coerce.date({ invalid_type_error: 'Fecha inválida' }).nullable(),
    orden: z.coerce.number().int().min(0),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export type CrearEntregableInput = z.infer<typeof crearEntregableSchema>;
export type ActualizarEntregableInput = z.infer<typeof actualizarEntregableSchema>;
