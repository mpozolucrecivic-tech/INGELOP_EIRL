import { z } from 'zod';
import { TipoEvidencia } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

/** Campos de texto del multipart/form-data (el archivo va en el campo "archivo") */
export const crearEvidenciaSchema = z.object({
  tipo: z.nativeEnum(TipoEvidencia),
  titulo: z.string().trim().min(3, 'Título muy corto').max(200),
  descripcion: z.preprocess(emptyToUndefined, z.string().trim().max(2000).optional()),
  actividadId: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  fecha: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
});

export const listarEvidenciasQuery = z.object({
  tipo: z.nativeEnum(TipoEvidencia).optional(),
  actividadId: z.coerce.number().int().positive().optional(),
});

export type CrearEvidenciaInput = z.infer<typeof crearEvidenciaSchema>;
export type ListarEvidenciasQuery = z.infer<typeof listarEvidenciasQuery>;
