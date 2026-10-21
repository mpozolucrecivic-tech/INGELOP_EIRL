import { z } from 'zod';
import { EstadoObservacion, TipoCorrespondencia } from '../../generated/prisma/client';
import { emptyToUndefined } from '../../utils/schemas';

const fecha = z.coerce
  .date({ invalid_type_error: 'Fecha inválida', required_error: 'Indica la fecha' })
  .refine((d) => d.getUTCFullYear() >= 1990 && d.getUTCFullYear() <= 2100, { message: 'Fecha fuera de rango' });
// '' o null borran el valor al editar
const vacioANull = (v: unknown) => (v === '' || (typeof v === 'string' && v.trim() === '') ? null : v);
const fechaOpcional = z.preprocess(vacioANull, fecha.nullable().optional());
const textoOpcional = (max: number) => z.preprocess(vacioANull, z.string().trim().max(max).nullable().optional());
const idOpcional = z.preprocess(vacioANull, z.coerce.number().int().positive().nullable().optional());
const texto = (min: number, max: number, requerido: string) => z.string({ required_error: requerido }).trim().min(min, requerido).max(max);

// ---------- Observaciones de la entidad ----------

const observacionCampos = {
  documento: texto(3, 200, 'Indica el documento que contiene la observación (oficio, informe…)'),
  fechaRecepcion: fecha,
  fechaLimite: fechaOpcional,
  descripcion: texto(5, 5000, 'Describe la observación'),
  etapaId: idOpcional,
  responsableId: idOpcional,
  estado: z.nativeEnum(EstadoObservacion),
  respuesta: textoOpcional(5000),
  fechaRespuesta: fechaOpcional,
  correspondenciaId: idOpcional,
};

export const crearObservacionSchema = z
  .object({ ...observacionCampos, estado: observacionCampos.estado.default(EstadoObservacion.PENDIENTE) })
  .refine((d) => !d.fechaLimite || d.fechaLimite >= d.fechaRecepcion, { message: 'El plazo no puede ser anterior a la recepción', path: ['fechaLimite'] });

export const actualizarObservacionSchema = z
  .object(observacionCampos)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

/** Lo que puede cambiar un arquitecto o ingeniero: avanzar el trabajo y redactar la respuesta */
export const CAMPOS_EQUIPO = ['estado', 'respuesta'] as const;
export const ESTADOS_EQUIPO: EstadoObservacion[] = [EstadoObservacion.PENDIENTE, EstadoObservacion.EN_PROCESO];

export const listarObservacionesQuery = z.object({
  estado: z.union([z.nativeEnum(EstadoObservacion), z.literal('ABIERTAS')]).optional(), // ABIERTAS = pendientes y en proceso
});

// ---------- Correspondencia (multipart: llega como texto) ----------

const correspondenciaCampos = {
  tipo: z.nativeEnum(TipoCorrespondencia, { errorMap: () => ({ message: 'Tipo: ENVIADA o RECIBIDA' }) }),
  numero: texto(1, 120, 'Indica el número del documento'),
  fecha,
  asunto: texto(3, 300, 'Indica el asunto'),
  entidad: texto(2, 200, 'Indica a quién se envió o quién la envió'),
  referencia: textoOpcional(300),
  respondeAId: idOpcional,
};

export const crearCorrespondenciaSchema = z.object(correspondenciaCampos);

export const actualizarCorrespondenciaSchema = z
  .object(correspondenciaCampos)
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarCorrespondenciaQuery = z.object({
  tipo: z.nativeEnum(TipoCorrespondencia).optional(),
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
});

// ---------- Ampliaciones de plazo ----------

const dias = z.coerce.number({ invalid_type_error: 'Indica los días' }).int('Solo días enteros').min(1, 'Al menos 1 día').max(3650, 'Demasiados días');

export const crearAmpliacionSchema = z.object({
  motivo: texto(5, 2000, 'Explica el motivo'),
  diasSolicitados: dias,
  fechaSolicitud: fecha,
});

export const actualizarAmpliacionSchema = crearAmpliacionSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const resolverAmpliacionSchema = z
  .object({
    estado: z.enum(['APROBADA', 'DENEGADA'], { errorMap: () => ({ message: 'Estado: APROBADA o DENEGADA' }) }),
    diasAprobados: dias.optional(),
    fechaResolucion: fecha,
    documentoResolucion: textoOpcional(200),
  })
  .refine((d) => d.estado === 'DENEGADA' || d.diasAprobados !== undefined, { message: 'Indica los días aprobados', path: ['diasAprobados'] });

export type CrearObservacionInput = z.infer<typeof crearObservacionSchema>;
export type ActualizarObservacionInput = z.infer<typeof actualizarObservacionSchema>;
export type ListarObservacionesQuery = z.infer<typeof listarObservacionesQuery>;
export type CrearCorrespondenciaInput = z.infer<typeof crearCorrespondenciaSchema>;
export type ActualizarCorrespondenciaInput = z.infer<typeof actualizarCorrespondenciaSchema>;
export type ListarCorrespondenciaQuery = z.infer<typeof listarCorrespondenciaQuery>;
export type CrearAmpliacionInput = z.infer<typeof crearAmpliacionSchema>;
export type ActualizarAmpliacionInput = z.infer<typeof actualizarAmpliacionSchema>;
export type ResolverAmpliacionInput = z.infer<typeof resolverAmpliacionSchema>;
