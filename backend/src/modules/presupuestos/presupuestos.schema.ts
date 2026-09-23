import { z } from 'zod';
import { EstadoRevision } from '@prisma/client';

const porcentaje = z.coerce.number().min(0, 'No puede ser negativo').max(100, 'Máximo 100%');

const cabecera = z.object({
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(200),
  fecha: z.coerce.date({ invalid_type_error: 'Fecha inválida' }).optional(),
  gastosGeneralesPct: porcentaje.optional(),
  utilidadPct: porcentaje.optional(),
  igvPct: porcentaje.optional(),
  observaciones: z.string().trim().max(2000).nullable().optional(),
});

export const crearPresupuestoSchema = cabecera;

export const actualizarPresupuestoSchema = cabecera
  .extend({ estado: z.nativeEnum(EstadoRevision) })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' });

const partida = z
  .object({
    item: z
      .string()
      .trim()
      .regex(/^\d{1,3}(\.\d{1,3})*$/, 'Ítem inválido (use 01, 01.01, 01.01.02…)'),
    descripcion: z.string().trim().min(1, 'Descripción requerida').max(500),
    esTitulo: z.boolean().default(false),
    unidad: z.string().trim().max(20).nullable().optional(),
    metrado: z.coerce.number().min(0, 'No puede ser negativo').nullable().optional(),
    precioUnitario: z.coerce.number().min(0, 'No puede ser negativo').nullable().optional(),
  })
  .refine((p) => p.esTitulo || (!!p.unidad && p.metrado != null && p.precioUnitario != null), {
    message: 'Las partidas (no títulos) requieren unidad, metrado y precio unitario',
  });

/** Reemplaza todas las partidas del presupuesto (guardado desde la hoja editable) */
export const guardarPartidasSchema = z.object({
  partidas: z.array(partida).max(3000, 'Máximo 3000 partidas'),
});

export type CrearPresupuestoInput = z.infer<typeof crearPresupuestoSchema>;
export type ActualizarPresupuestoInput = z.infer<typeof actualizarPresupuestoSchema>;
export type PartidaInput = z.infer<typeof partida>;
