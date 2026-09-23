import { z } from 'zod';
import { Especialidad, EstadoRevision } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

/** Campos de texto del multipart/form-data (el archivo va en el campo "archivo") */
export const crearPlanoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Código requerido')
    .max(20)
    .regex(/^[A-Z0-9][A-Z0-9.\-_/]*$/, 'Use letras, números y guiones (ej. A-01, E-03)'),
  titulo: z.string().trim().min(3, 'Título muy corto').max(200),
  especialidad: z.nativeEnum(Especialidad),
  responsableId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  comentario: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export const nuevaVersionSchema = z.object({
  comentario: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

/** Edición y revisión (solo ADMIN) */
export const actualizarPlanoSchema = z
  .object({
    codigo: crearPlanoSchema.shape.codigo,
    titulo: crearPlanoSchema.shape.titulo,
    especialidad: z.nativeEnum(Especialidad),
    responsableId: z.number().int().positive().nullable(),
    estado: z.nativeEnum(EstadoRevision),
    observacion: z.string().trim().max(1000).nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' })
  .refine((d) => d.estado !== EstadoRevision.OBSERVADO || !!d.observacion, {
    message: 'Indica la observación al marcar el plano como OBSERVADO',
    path: ['observacion'],
  });

export const listarPlanosQuery = z.object({
  especialidad: z.nativeEnum(Especialidad).optional(),
  estado: z.nativeEnum(EstadoRevision).optional(),
});

export type CrearPlanoInput = z.infer<typeof crearPlanoSchema>;
export type NuevaVersionInput = z.infer<typeof nuevaVersionSchema>;
export type ActualizarPlanoInput = z.infer<typeof actualizarPlanoSchema>;
export type ListarPlanosQuery = z.infer<typeof listarPlanosQuery>;
