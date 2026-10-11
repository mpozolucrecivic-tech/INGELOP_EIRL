import { z } from 'zod';

const texto = (max: number) => z.string().trim().min(1).max(max).optional();

export const filtrosAuditoriaQuery = z
  .object({
    desde: z.coerce.date().optional(),
    hasta: z.coerce.date().optional(),
    usuarioId: z.coerce.number().int().positive().optional(),
    modulo: texto(40),
    accion: texto(40),
    resultado: z.enum(['EXITO', 'FALLO']).optional(),
    ip: texto(64),
    pagina: z.coerce.number().int().min(1).default(1),
    porPagina: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine((q) => !q.desde || !q.hasta || q.desde <= q.hasta, { message: '"desde" debe ser anterior o igual a "hasta"', path: ['hasta'] });

export type FiltrosAuditoria = z.infer<typeof filtrosAuditoriaQuery>;
