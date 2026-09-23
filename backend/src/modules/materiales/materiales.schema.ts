import { z } from 'zod';
import { TipoMovimiento } from '@prisma/client';
import { decimal } from '../../utils/schemas';

export const crearMaterialSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre muy corto').max(200),
  unidad: z.string().trim().min(1).max(30), // ej. m3, bolsa, kg, und
  stockMinimo: decimal,
  // Stock inicial opcional: se registra como un movimiento de ENTRADA para mantener la trazabilidad
  stockInicial: decimal.optional(),
});

export const actualizarMaterialSchema = z
  .object({
    nombre: z.string().trim().min(2).max(200),
    unidad: z.string().trim().min(1).max(30),
    stockMinimo: decimal,
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const crearMovimientoSchema = z.object({
  tipo: z.nativeEnum(TipoMovimiento),
  cantidad: decimal.refine((n) => n > 0, { message: 'La cantidad debe ser mayor a 0' }),
  fecha: z.coerce.date().optional(),
  observacion: z.string().trim().max(500).optional(),
});

export type CrearMaterialInput = z.infer<typeof crearMaterialSchema>;
export type ActualizarMaterialInput = z.infer<typeof actualizarMaterialSchema>;
export type CrearMovimientoInput = z.infer<typeof crearMovimientoSchema>;
