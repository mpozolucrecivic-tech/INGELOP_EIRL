import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schemas';

const servicioBase = z.object({
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(120),
  descripcion: z.string().trim().min(10, 'Descripción muy corta (mínimo 10 caracteres)').max(1000),
  // Ancla de la web y valor del <select> de contacto: minúsculas, números y guiones
  slug: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones (ej. expedientes-tecnicos)')
      .max(60)
      .nullable()
      .optional(),
  ),
  // Nombre de un icono de web/includes/iconos.php
  icono: z.preprocess(
    emptyToUndefined,
    z.string().trim().regex(/^[a-z0-9-]{1,40}$/, 'Nombre de icono inválido').nullable().optional(),
  ),
  items: z.array(z.string().trim().min(1).max(200)).max(20, 'Máximo 20 puntos').default([]),
  orden: z.coerce.number().int().min(0).max(9999).optional(),
  activo: z.boolean().default(true),
});

export const crearServicioSchema = servicioBase;

export const actualizarServicioSchema = servicioBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export type CrearServicioInput = z.infer<typeof crearServicioSchema>;
export type ActualizarServicioInput = z.infer<typeof actualizarServicioSchema>;
