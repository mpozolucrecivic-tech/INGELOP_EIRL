import { z } from 'zod';
import { EstadoMensaje, TipoMensaje } from '../../generated/prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const opcional = (schema: z.ZodString) => z.preprocess(emptyToUndefined, schema.optional());
// Campos de una línea: saltos de línea y espacios repetidos -> un espacio (van en el asunto y el cuerpo del aviso)
const unaLinea = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Mismas reglas que el formulario PHP de la web (contacto.php) */
export const crearMensajeSchema = z.object({
  nombre: z
    .string({ required_error: 'Ingresa tu nombre.' })
    .transform(unaLinea)
    .pipe(z.string().min(3, 'Ingresa tu nombre.').max(120, 'Texto demasiado largo.')),
  correo: z
    .string({ required_error: 'Ingresa un correo válido.' })
    .trim()
    .toLowerCase()
    .max(150, 'Texto demasiado largo.')
    .email('Ingresa un correo válido.'),
  telefono: opcional(z.string().trim().regex(/^[0-9 +()-]{6,20}$/, 'Teléfono no válido.')),
  tipo: z.nativeEnum(TipoMensaje, { errorMap: () => ({ message: 'Selecciona un tipo de consulta válido.' }) }).default(TipoMensaje.CONTACTO),
  entidad: z.preprocess(
    (v) => emptyToUndefined(typeof v === 'string' ? unaLinea(v) : v),
    z.string().max(150, 'Texto demasiado largo.').optional(),
  ),
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
  // PENDIENTES = todo lo que no está archivado (bandeja de entrada)
  estado: z.union([z.nativeEnum(EstadoMensaje), z.literal('PENDIENTES')]).optional(),
  leido: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().min(1).optional(),
});

export const marcarLeidoSchema = z.object({
  leido: z.boolean({ required_error: 'Indica si el mensaje está leído (true/false)' }),
});

export const actualizarMensajeSchema = z
  .object({
    estado: z.nativeEnum(EstadoMensaje, { errorMap: () => ({ message: 'Estado no válido (NUEVO, RESPONDIDO o ARCHIVADO)' }) }).optional(),
    // "" o null borran la nota
    nota: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().max(2000, 'La nota no puede superar 2000 caracteres').nullable().optional()),
  })
  .refine((d) => d.estado !== undefined || d.nota !== undefined, { message: 'Indica el estado o la nota' });

export type CrearMensajeInput = z.infer<typeof crearMensajeSchema>;
export type ListarMensajesQuery = z.infer<typeof listarMensajesQuery>;
export type ActualizarMensajeInput = z.infer<typeof actualizarMensajeSchema>;
