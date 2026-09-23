import { z } from 'zod';
import { EstadoActividad } from '@prisma/client';

const avance = z.coerce.number().int('El avance debe ser entero').min(0).max(100);

export const crearActividadSchema = z.object({
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(300),
  responsableId: z.coerce.number().int().positive(),
  estado: z.nativeEnum(EstadoActividad).default(EstadoActividad.BACKLOG),
  avance: avance.default(0),
});

/** Movimiento en el tablero (estado/avance) y edición básica */
export const actualizarActividadSchema = z
  .object({
    estado: z.nativeEnum(EstadoActividad),
    avance,
    nombre: z.string().trim().min(3).max(300),
    responsableId: z.coerce.number().int().positive(),
    sprintId: z.coerce.number().int().positive(), // mover a otro sprint del mismo proyecto
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarActividadesQuery = z.object({
  vista: z.enum(['lista', 'kanban']).default('lista'),
  estado: z.nativeEnum(EstadoActividad).optional(),
});

export type CrearActividadInput = z.infer<typeof crearActividadSchema>;
export type ActualizarActividadInput = z.infer<typeof actualizarActividadSchema>;
export type ListarActividadesQuery = z.infer<typeof listarActividadesQuery>;
