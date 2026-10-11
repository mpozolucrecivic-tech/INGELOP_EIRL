import { z } from 'zod';

export const slugSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
// Solo enlaces locales a páginas PHP o HTTPS; nunca javascript:, data: ni //host.
export const enlaceSchema = z.string().trim().max(500).refine(
  (v) => v === '' || /^https:\/\/[^\s]+$/.test(v) || /^(?:[a-z0-9-]+\.php)(?:[?#][a-zA-Z0-9%=&_#.-]*)?$/.test(v),
  'Usa un enlace HTTPS o una página local .php',
);
export const bloqueSchema = z.object({
  id: z.string().min(1).max(80),
  tipo: z.enum(['texto', 'servicios', 'portafolio', 'contacto']),
  visible: z.boolean().default(true),
  titulo: z.string().trim().max(200).default(''),
  texto: z.string().trim().max(10000).default(''),
  medioId: z.number().int().positive().nullable().default(null),
  botonTexto: z.string().trim().max(80).default(''),
  botonUrl: enlaceSchema.default(''),
});
export const paginaSchema = z.object({
  tipo: z.literal('pagina'), slug: slugSchema,
  titulo: z.string().trim().min(1).max(200),
  descripcion: z.string().trim().max(300).default(''),
  imagenSocialId: z.number().int().positive().nullable().default(null),
  bloques: z.array(bloqueSchema).max(40),
}).superRefine((p, ctx) => {
  if (new Set(p.bloques.map((b) => b.id)).size !== p.bloques.length)
    ctx.addIssue({ code: 'custom', path: ['bloques'], message: 'Los bloques deben tener identificadores distintos' });
  const contactos = p.bloques.filter((b) => b.tipo === 'contacto' && b.visible).length;
  if (contactos > 1 || (contactos && p.slug !== 'contacto'))
    ctx.addIssue({ code: 'custom', path: ['bloques'], message: 'El formulario solo puede aparecer una vez en la página contacto' });
  // Sin el formulario, los clientes no podrían escribir a la empresa desde la web
  if (p.slug === 'contacto' && contactos === 0)
    ctx.addIssue({ code: 'custom', path: ['bloques'], message: 'La página de contacto debe incluir el formulario visible' });
});
export const configuracionSchema = z.object({
  tipo: z.literal('configuracion'),
  nombre: z.string().trim().min(1).max(100),
  subtitulo: z.string().trim().max(120),
  descripcion: z.string().trim().max(500),
  logoId: z.number().int().positive().nullable().default(null),
  menu: z.array(z.object({ etiqueta: z.string().trim().min(1).max(60), slug: slugSchema })).max(20),
});
export const contenidoSchema = z.union([paginaSchema, configuracionSchema]);
export const guardarCmsSchema = z.object({ version: z.number().int().nonnegative(), contenido: contenidoSchema });
export const versionSchema = z.object({ version: z.number().int().positive() });
export const claveParams = z.object({ clave: z.string().regex(/^(configuracion|pagina\.[a-z0-9]+(?:-[a-z0-9]+)*)$/).max(90) });
export const medioParams = z.object({ id: z.coerce.number().int().positive() });
export type ContenidoCms = z.infer<typeof contenidoSchema>;
