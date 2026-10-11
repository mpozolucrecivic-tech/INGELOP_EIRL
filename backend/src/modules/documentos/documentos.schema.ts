import { z } from 'zod';
import { CategoriaDocumento, TipoEtapa } from '@prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const categoria = z.nativeEnum(CategoriaDocumento, { errorMap: () => ({ message: 'Elige una categoría válida' }) });
const descripcion = z.preprocess(emptyToUndefined, z.string().trim().max(500).optional());

/** Campos del formulario multipart (el archivo va en "archivo") */
export const subirDocumentoSchema = z.object({ categoria, descripcion });

export const editarDocumentoSchema = z
  .object({ categoria: categoria.optional(), descripcion: z.string().trim().max(500).nullable().optional() })
  .refine((d) => d.categoria !== undefined || d.descripcion !== undefined, { message: 'Envía la categoría o la descripción' });

export const documentosProyectoQuery = z.object({
  etapaId: z.coerce.number().int().positive().optional(),
  categoria: categoria.optional(),
});

export const listarDocumentosQuery = z
  .object({
    proyectoId: z.coerce.number().int().positive().optional(),
    etapa: z.nativeEnum(TipoEtapa).optional(),
    categoria: categoria.optional(),
    usuarioId: z.coerce.number().int().positive().optional(),
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
    q: z.string().trim().min(1).max(100).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, { message: '"desde" debe ser anterior o igual a "hasta"', path: ['hasta'] });

export const etapaParams = z.object({
  id: z.coerce.number().int().positive(),
  etapaId: z.coerce.number().int().positive(),
});

export type SubirDocumentoInput = z.infer<typeof subirDocumentoSchema>;
export type EditarDocumentoInput = z.infer<typeof editarDocumentoSchema>;
export type DocumentosProyectoQuery = z.infer<typeof documentosProyectoQuery>;
export type ListarDocumentosQuery = z.infer<typeof listarDocumentosQuery>;
