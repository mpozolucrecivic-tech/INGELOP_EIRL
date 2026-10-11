import { z } from 'zod';
import { TipoEtapa } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const fecha = z.preprocess(emptyToUndefined, z.coerce.date({ invalid_type_error: 'Fecha no válida' }).nullable().optional());

export const iniciarEtapaSchema = z.object({
  tipo: z.nativeEnum(TipoEtapa, { errorMap: () => ({ message: 'Etapa no válida' }) }),
  fechaInicio: fecha,
  fechaFin: fecha,
});

export const editarEtapaSchema = z
  .object({ fechaInicio: fecha, fechaFin: fecha })
  .refine((d) => d.fechaInicio !== undefined || d.fechaFin !== undefined, { message: 'Envía la fecha de inicio o la de fin' });

export const observarEtapaSchema = z.object({
  observacion: z
    .string({ required_error: 'Escribe qué hay que corregir' })
    .trim()
    .min(5, 'Escribe qué hay que corregir (mínimo 5 caracteres)')
    .max(2000),
});

export type IniciarEtapaInput = z.infer<typeof iniciarEtapaSchema>;
export type EditarEtapaInput = z.infer<typeof editarEtapaSchema>;
