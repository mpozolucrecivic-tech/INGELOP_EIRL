import { z } from 'zod';
import { emptyToUndefined } from '../../utils/schemas';

const textoOpcional = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).nullable().optional());

const proyectoWebBase = z.object({
  titulo: z.string().trim().min(5, 'Título muy corto (mínimo 5 caracteres)').max(200),
  cliente: textoOpcional(150),
  ubicacion: textoOpcional(120),
  anio: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(2000, 'Año no válido').max(new Date().getFullYear() + 1, 'Año no válido').nullable().optional(),
  ),
  servicio: textoOpcional(120),
  orden: z.coerce.number().int().min(0).max(9999).optional(),
  activo: z.boolean().default(true),
});

export const crearProyectoWebSchema = proyectoWebBase;

export const actualizarProyectoWebSchema = proyectoWebBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export type CrearProyectoWebInput = z.infer<typeof crearProyectoWebSchema>;
export type ActualizarProyectoWebInput = z.infer<typeof actualizarProyectoWebSchema>;
