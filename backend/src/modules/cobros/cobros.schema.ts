import { z } from 'zod';
import { EstadoCobro, EstadoGarantia, TipoGarantia } from '@prisma/client';
import { decimal } from '../../utils/schemas';

const tope = <T extends z.ZodType<number>>(s: T) => s.refine((n) => n < 1e10, { message: 'Monto demasiado grande' });
const monto = tope(decimal.refine((n) => n > 0, { message: 'El monto debe ser mayor a 0' }));
const montoCero = tope(decimal);
const fecha = z.coerce
  .date({ invalid_type_error: 'Fecha inválida' })
  .refine((d) => d.getUTCFullYear() >= 1990 && d.getUTCFullYear() <= 2100, { message: 'Fecha fuera de rango' });
// '' o null borran la fecha o el texto
const vacioANull = (v: unknown) => (v === '' ? null : v);
const fechaOpcional = z.preprocess(vacioANull, fecha.nullable().optional());
const textoOpcional = (max: number) => z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? null : v), z.string().trim().max(max).nullable().optional());

// ---------- Cobros ----------

const cobroCampos = {
  concepto: z.string({ required_error: 'Indica el concepto' }).trim().min(3, 'Concepto muy corto').max(200),
  monto,
  detraccion: montoCero,
  penalidad: montoCero,
  fechaProgramada: fechaOpcional,
  comprobante: z.preprocess(
    (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim().toUpperCase()) : v),
    z.string().max(30, 'Máximo 30 caracteres').regex(/^[A-Z0-9][A-Z0-9 -]*$/, 'Usa la serie y el número, ej. E001-123').nullable().optional(),
  ),
  fechaEmision: fechaOpcional,
  fechaCobro: fechaOpcional,
  estado: z.nativeEnum(EstadoCobro),
  observacion: textoOpcional(1000),
};

export const crearCobroSchema = z.object({
  ...cobroCampos,
  detraccion: cobroCampos.detraccion.default(0),
  penalidad: cobroCampos.penalidad.default(0),
  estado: cobroCampos.estado.default(EstadoCobro.PROGRAMADO),
});

export const actualizarCobroSchema = z
  .object(cobroCampos)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarCobrosQuery = z.object({
  estado: z.union([z.nativeEnum(EstadoCobro), z.literal('PENDIENTES')]).optional(), // PENDIENTES = programados y facturados
  proyectoId: z.coerce.number().int().positive().optional(),
});

// ---------- Cartas fianza ----------

const cartaCampos = {
  tipo: z.nativeEnum(TipoGarantia),
  numero: z.string({ required_error: 'Indica el número de la carta' }).trim().min(1, 'Indica el número de la carta').max(60),
  entidadFinanciera: z.string({ required_error: 'Indica el banco o la entidad' }).trim().min(2, 'Indica el banco o la entidad').max(120),
  monto,
  fechaEmision: fecha,
  fechaVencimiento: fecha,
  observacion: textoOpcional(1000),
};

const vencimientoPosterior = (d: { fechaEmision?: Date; fechaVencimiento?: Date }) => !d.fechaEmision || !d.fechaVencimiento || d.fechaVencimiento > d.fechaEmision;
const MSJ_VENCIMIENTO = { message: 'El vencimiento debe ser posterior a la emisión', path: ['fechaVencimiento'] };

export const crearCartaSchema = z.object({ ...cartaCampos, tipo: cartaCampos.tipo.default(TipoGarantia.FIEL_CUMPLIMIENTO) }).refine(vencimientoPosterior, MSJ_VENCIMIENTO);

export const actualizarCartaSchema = z
  .object({
    ...cartaCampos,
    // RENOVADA solo se asigna al renovar (POST /cartas-fianza/:id/renovar)
    estado: z.enum([EstadoGarantia.VIGENTE, EstadoGarantia.DEVUELTA, EstadoGarantia.EJECUTADA], {
      errorMap: () => ({ message: 'Estado no válido: VIGENTE, DEVUELTA o EJECUTADA (para renovar usa «Renovar»)' }),
    }),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' })
  .refine(vencimientoPosterior, MSJ_VENCIMIENTO);

/** La nueva carta hereda tipo, banco y monto de la anterior salvo que se indiquen */
export const renovarCartaSchema = z
  .object({
    numero: cartaCampos.numero,
    fechaEmision: fecha,
    fechaVencimiento: fecha,
    monto: monto.optional(),
    entidadFinanciera: cartaCampos.entidadFinanciera.optional(),
    observacion: textoOpcional(1000),
  })
  .refine(vencimientoPosterior, MSJ_VENCIMIENTO);

export const listarCartasQuery = z.object({
  estado: z.nativeEnum(EstadoGarantia).optional(),
  proyectoId: z.coerce.number().int().positive().optional(),
});

export type CrearCobroInput = z.infer<typeof crearCobroSchema>;
export type ActualizarCobroInput = z.infer<typeof actualizarCobroSchema>;
export type ListarCobrosQuery = z.infer<typeof listarCobrosQuery>;
export type CrearCartaInput = z.infer<typeof crearCartaSchema>;
export type ActualizarCartaInput = z.infer<typeof actualizarCartaSchema>;
export type RenovarCartaInput = z.infer<typeof renovarCartaSchema>;
export type ListarCartasQuery = z.infer<typeof listarCartasQuery>;
