import { z } from 'zod';
import { TipoMensaje } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const opcional = (schema: z.ZodString) => z.preprocess(emptyToUndefined, schema.optional());

/** Mismas reglas que el formulario PHP de la web (contacto.php) */
export const crearMensajeSchema = z.object({
  nombre: z.string({ required_error: 'Ingresa tu nombre.' }).trim().min(3, 'Ingresa tu nombre.').max(120, 'Texto demasiado largo.'),
  correo: z
    .string({ required_error: 'Ingresa un correo válido.' })
    .trim()
    .toLowerCase()
    .max(150, 'Texto demasiado largo.')
    .email('Ingresa un correo válido.'),
  telefono: opcional(z.string().trim().regex(/^[0-9 +()-]{6,20}$/, 'Teléfono no válido.')),
  tipo: z.nativeEnum(TipoMensaje, { errorMap: () => ({ message: 'Selecciona un tipo de consulta válido.' }) }).default(TipoMensaje.CONTACTO),
  entidad: opcional(z.string().trim().max(150, 'Texto demasiado largo.')),
  servicio: opcional(z.string().trim().max(60)),
  mensaje: z
    .string({ required_error: 'Cuéntanos un poco más sobre tu proyecto (mínimo 10 caracteres).' })
    .trim()
    .min(10, 'Cuéntanos un poco más sobre tu proyecto (mínimo 10 caracteres).')
    .max(3000, 'Texto demasiado largo.'),
  // Campo trampa: las personas no lo ven; si llega con texto, es un bot
  sitio_web: z.string().optional(),
});

export const listarMensajesQuery = z.object({
  tipo: z.nativeEnum(TipoMensaje).optional(),
  leido: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().min(1).optional(),
});

export const marcarLeidoSchema = z.object({
  leido: z.boolean({ required_error: 'Indica si el mensaje está leído (true/false)' }),
});

export type CrearMensajeInput = z.infer<typeof crearMensajeSchema>;
export type ListarMensajesQuery = z.infer<typeof listarMensajesQuery>;
