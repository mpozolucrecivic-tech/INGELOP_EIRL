import { z } from 'zod';
import { CategoriaGasto } from '@prisma/client';
import { decimal, rangoFechasQuery } from '../../utils/schemas';

const gastoBase = z.object({
  categoria: z.nativeEnum(CategoriaGasto),
  descripcion: z.string().trim().min(3, 'Descripción muy corta').max(500),
  monto: decimal.refine((n) => n > 0, { message: 'El monto debe ser mayor a 0' }),
  fecha: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
});

export const crearGastoSchema = gastoBase;

export const actualizarGastoSchema = gastoBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarGastosQuery = rangoFechasQuery.and(
  z.object({ categoria: z.nativeEnum(CategoriaGasto).optional() }),
);

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type ActualizarGastoInput = z.infer<typeof actualizarGastoSchema>;
export type ListarGastosQuery = z.infer<typeof listarGastosQuery>;
