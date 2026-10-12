import { z } from 'zod';
import { CategoriaGasto } from '@prisma/client';
import { decimal, rangoFechasQuery } from '../../utils/schemas';

/** Categorías de los gastos de un proyecto y de los gastos de la empresa (OTROS sirve para ambos) */
export const CATEGORIAS_PROYECTO: CategoriaGasto[] = ['MATERIALES', 'MANO_DE_OBRA', 'TRANSPORTE', 'EQUIPOS', 'OTROS'];
export const CATEGORIAS_EMPRESA: CategoriaGasto[] = ['ALQUILER', 'SERVICIOS_BASICOS', 'SUELDOS', 'SOFTWARE', 'IMPUESTOS', 'UTILES_OFICINA', 'OTROS'];

export const categoriaValida = (categoria: CategoriaGasto, proyectoId: number | null) =>
  (proyectoId ? CATEGORIAS_PROYECTO : CATEGORIAS_EMPRESA).includes(categoria);

export const MAX_FILAS_IMPORTACION = 1000;

const monto = decimal.refine((n) => n > 0, { message: 'El monto debe ser mayor a 0' }).refine((n) => n < 1e10, { message: 'Monto demasiado grande' });
const fecha = z.coerce
  .date({ invalid_type_error: 'Fecha inválida' })
  .refine((d) => d.getUTCFullYear() >= 1990 && d.getUTCFullYear() <= 2100, { message: 'Fecha fuera de rango' });

const gastoBase = z.object({
  categoria: z.nativeEnum(CategoriaGasto),
  descripcion: z.string().trim().min(3, 'Descripción muy corta').max(500),
  monto,
  fecha,
});

export const crearGastoSchema = gastoBase;

export const actualizarGastoSchema = gastoBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

export const listarGastosQuery = rangoFechasQuery.and(
  z.object({ categoria: z.nativeEnum(CategoriaGasto).optional() }),
);

/**
 * Importación desde Excel. El navegador lee el archivo y envía solo las filas ya emparejadas;
 * aquí se vuelve a validar cada una. proyectoId de la fila: null = gasto de la empresa.
 */
const filaImportacion = gastoBase.extend({
  fila: z.number().int().positive(), // número de fila en el Excel, para los mensajes de error
  proyectoId: z.number().int().positive().nullable(),
});

const filasImportacion = z
  .array(filaImportacion)
  .min(1, 'No hay filas para importar')
  .max(MAX_FILAS_IMPORTACION, `Máximo ${MAX_FILAS_IMPORTACION} filas por importación`);

export const importarGastosSchema = z.object({
  nombreArchivo: z.string().trim().min(1).max(200),
  // Desde dónde se importa: un proyecto (todas las filas van a él) o null = "Gastos de la empresa"
  origenProyectoId: z.number().int().positive().nullable(),
  filas: filasImportacion,
});

export const verificarImportacionSchema = z.object({ filas: filasImportacion });

export const listarImportacionesQuery = z.object({
  proyectoId: z.coerce.number().int().positive().optional(), // sin proyectoId: las hechas desde "Gastos de la empresa"
});

export type CrearGastoInput = z.infer<typeof crearGastoSchema>;
export type ActualizarGastoInput = z.infer<typeof actualizarGastoSchema>;
export type ListarGastosQuery = z.infer<typeof listarGastosQuery>;
export type ImportarGastosInput = z.infer<typeof importarGastosSchema>;
export type FilaImportacion = z.infer<typeof filaImportacion>;
