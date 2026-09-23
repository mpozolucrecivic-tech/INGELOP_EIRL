import { z } from 'zod';
import { EstadoProyecto, RubroObra, TipoServicio } from '@prisma/client';
import { decimal } from '../../utils/schemas';

const proyectoBase = z.object({
  nombre: z.string().trim().min(3, 'Nombre muy corto').max(200),
  clienteId: z.coerce.number().int().positive(),
  tipoServicio: z.nativeEnum(TipoServicio).default(TipoServicio.EXPEDIENTE_TECNICO),
  rubro: z.nativeEnum(RubroObra).default(RubroObra.EDIFICACIONES), // especialidad RNP (OSCE)
  ubicacion: z.string().trim().min(2).max(300),
  fechaInicio: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
  fechaFin: z.coerce.date({ invalid_type_error: 'Fecha inválida' }),
  montoContrato: decimal, // honorarios pactados
  estado: z.nativeEnum(EstadoProyecto).default(EstadoProyecto.PLANIFICADA),
  responsableId: z.coerce.number().int().positive(),
});

const fechasCoherentes = (d: { fechaInicio?: Date; fechaFin?: Date }) =>
  !d.fechaInicio || !d.fechaFin || d.fechaFin >= d.fechaInicio;
const errorFechas = { message: 'fechaFin debe ser posterior o igual a fechaInicio', path: ['fechaFin'] };

export const crearProyectoSchema = proyectoBase.refine(fechasCoherentes, errorFechas);

export const actualizarProyectoSchema = proyectoBase
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Debe enviar al menos un campo a actualizar' })
  .refine(fechasCoherentes, errorFechas);

export const listarProyectosQuery = z.object({
  estado: z.nativeEnum(EstadoProyecto).optional(),
  clienteId: z.coerce.number().int().positive().optional(),
  rubro: z.nativeEnum(RubroObra).optional(),
  q: z.string().trim().min(1).optional(),
});

export const asignarUsuarioSchema = z.object({
  usuarioId: z.coerce.number().int().positive(),
});

export const usuarioProyectoParams = z.object({
  id: z.coerce.number().int().positive(),
  usuarioId: z.coerce.number().int().positive(),
});

export type CrearProyectoInput = z.infer<typeof crearProyectoSchema>;
export type ActualizarProyectoInput = z.infer<typeof actualizarProyectoSchema>;
export type ListarProyectosQuery = z.infer<typeof listarProyectosQuery>;
