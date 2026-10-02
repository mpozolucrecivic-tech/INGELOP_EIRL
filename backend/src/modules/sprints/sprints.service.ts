import { EstadoActividad } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import { round2 } from '../../utils/helpers';
import type { UsuarioAutenticado } from '../../types/express';
import type { ActualizarSprintInput, CrearSprintInput } from './sprints.schema';

/** Conteo de actividades por estado (todas las columnas del tablero, aunque estén en 0) */
export function conteoPorEstado(actividades: { estado: EstadoActividad }[]) {
  const conteo = Object.fromEntries(Object.values(EstadoActividad).map((e) => [e, 0])) as Record<EstadoActividad, number>;
  for (const a of actividades) conteo[a.estado]++;
  return conteo;
}

/** Avance promedio de un conjunto de actividades (COMPLETADA cuenta como 100%) */
export function avancePromedio(actividades: { estado: EstadoActividad; avance: number }[]) {
  if (!actividades.length) return 0;
  const total = actividades.reduce((s, a) => s + (a.estado === EstadoActividad.COMPLETADA ? 100 : a.avance), 0);
  return round2(total / actividades.length);
}

/** Obtiene un sprint verificando que el usuario tenga acceso a su proyecto */
export async function obtenerSprintConAcceso(usuario: UsuarioAutenticado, sprintId: number) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) throw AppError.notFound('Periodo de trabajo no encontrado');
  await assertProjectAccess(usuario, sprint.proyectoId);
  return sprint;
}

export async function listarPorProyecto(proyectoId: number) {
  const hoy = new Date();
  const sprints = await prisma.sprint.findMany({
    where: { proyectoId },
    include: { actividades: { select: { estado: true, avance: true } } },
    orderBy: { numero: 'asc' },
  });

  return sprints.map(({ actividades, ...sprint }) => ({
    ...sprint,
    vigente: sprint.fechaInicio <= hoy && hoy <= sprint.fechaFin,
    totalActividades: actividades.length,
    actividadesPorEstado: conteoPorEstado(actividades),
    avance: avancePromedio(actividades),
  }));
}

export async function crear(proyectoId: number, data: CrearSprintInput) {
  let numero = data.numero;
  if (!numero) {
    const ultimo = await prisma.sprint.aggregate({ where: { proyectoId }, _max: { numero: true } });
    numero = (ultimo._max.numero ?? 0) + 1;
  }
  // @@unique([proyectoId, numero]) -> 409 si el número ya existe
  return prisma.sprint.create({ data: { ...data, numero, proyectoId } });
}

export async function actualizar(id: number, data: ActualizarSprintInput) {
  const actual = await prisma.sprint.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Periodo de trabajo no encontrado');
  const inicio = data.fechaInicio ?? actual.fechaInicio;
  const fin = data.fechaFin ?? actual.fechaFin;
  if (fin < inicio) throw AppError.badRequest('fechaFin debe ser posterior o igual a fechaInicio');
  return prisma.sprint.update({ where: { id }, data });
}

export async function eliminar(id: number) {
  await prisma.sprint.delete({ where: { id } }); // cascade elimina sus actividades
}
