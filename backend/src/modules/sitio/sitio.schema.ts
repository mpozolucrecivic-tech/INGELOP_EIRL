import { z } from 'zod';

const vacio = z.literal('');

/**
 * Datos de contacto de la web. Las claves son fijas: cualquier otra se rechaza.
 * Cada valor puede quedar vacío ('') mientras la empresa no apruebe publicarlo.
 */
export const VALIDADORES_SITIO = {
  telefono: z.string().trim().regex(/^[0-9 +()-]{6,20}$/, 'Teléfono no válido (ej. 979 660 255)').or(vacio),
  whatsapp: z
    .string()
    .trim()
    .regex(/^51\d{9}$/, 'Usa el formato internacional sin espacios ni "+": 51 + 9 dígitos (ej. 51979660255)')
    .or(vacio),
  email: z.string().trim().toLowerCase().email('Correo no válido').max(150).or(vacio),
  direccion: z.string().trim().max(200).or(vacio),
  distrito: z.string().trim().max(80).or(vacio),
  horario: z.string().trim().max(120).or(vacio),
  facebook: z.string().trim().url('Debe ser un enlace completo').startsWith('https://', 'Debe empezar con https://').max(300).or(vacio),
  linkedin: z.string().trim().url('Debe ser un enlace completo').startsWith('https://', 'Debe empezar con https://').max(300).or(vacio),
} as const;

export type ClaveSitio = keyof typeof VALIDADORES_SITIO;
export const CLAVES_SITIO = Object.keys(VALIDADORES_SITIO) as ClaveSitio[];

const datoSchema = z
  .object({
    clave: z.enum(CLAVES_SITIO as [ClaveSitio, ...ClaveSitio[]], { errorMap: () => ({ message: 'Dato desconocido' }) }),
    valor: z.string(),
    publicado: z.boolean(),
  })
  .superRefine((d, ctx) => {
    const r = VALIDADORES_SITIO[d.clave].safeParse(d.valor);
    if (!r.success) ctx.addIssue({ code: 'custom', path: ['valor'], message: r.error.issues[0].message });
    else if (d.publicado && r.data === '') ctx.addIssue({ code: 'custom', path: ['valor'], message: 'No se puede publicar un dato vacío' });
  })
  .transform((d) => ({ ...d, valor: VALIDADORES_SITIO[d.clave].parse(d.valor) as string }));

export const guardarSitioSchema = z.object({
  datos: z.array(datoSchema).min(1, 'Envía al menos un dato'),
});

export type GuardarSitioInput = z.infer<typeof guardarSitioSchema>;
