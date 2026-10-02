import { EstadoActividad } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import type { UsuarioAutenticado } from '../../types/express';
import { obtenerSprintConAcceso } from '../sprints/sprints.service';
import type { ActualizarActividadInput, CrearActividadInput, ListarActividadesQuery } from './actividades.schema';

const includeActividad = {
  responsable: { select: { id: true, nombre: true } },
  _count: { select: { evidencias: true } },
} as const;

async function assertResponsableActivo(id: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
  if (!usuario || !usuario.activo) throw AppError.badRequest('responsableId: el usuario no existe o está inactivo');
}

/** Al completar una actividad sin indicar avance, se asume 100% */
function normalizarAvance<T extends { estado?: EstadoActividad; avance?: number }>(data: T): T {
  if (data.estado === EstadoActividad.COMPLETADA && data.avance === undefined) return { ...data, avance: 100 };
  return data;
}

export async function listarPorSprint(usuario: UsuarioAutenticado, sprintId: number, query: ListarActividadesQuery) {
  const sprint = await obtenerSprintConAcceso(usuario, sprintId);

  const actividades = await prisma.actividad.findMany({
    where: { sprintId, ...(query.estado && { estado: query.estado }) },
    include: includeActividad,
    orderBy: { id: 'asc' },
  });

  if (query.vista === 'lista') return actividades;

  // Vista Kanban: una columna por estado, en el orden del flujo Scrum
  const columnas = Object.values(EstadoActividad).map((estado) => ({
    estado,
    actividades: actividades.filter((a) => a.estado === estado),
  }));
  return { sprint, columnas };
}

export async function crear(usuario: UsuarioAutenticado, sprintId: number, data: CrearActividadInput) {
  await obtenerSprintConAcceso(usuario, sprintId);
  await assertResponsableActivo(data.responsableId);
  return prisma.actividad.create({ data: { ...normalizarAvance(data), sprintId }, include: includeActividad });
}

export async function actualizar(usuario: UsuarioAutenticado, id: number, data: ActualizarActividadInput) {
  const actividad = await prisma.actividad.findUnique({ where: { id }, include: { sprint: { select: { proyectoId: true } } } });
  if (!actividad) throw AppError.notFound('Actividad no encontrada');
  await assertProjectAccess(usuario, actividad.sprint.proyectoId);

  if (data.responsableId) await assertResponsableActivo(data.responsableId);

  if (data.sprintId && data.sprintId !== actividad.sprintId) {
    const destino = await prisma.sprint.findUnique({ where: { id: data.sprintId }, select: { proyectoId: true } });
    if (!destino || destino.proyectoId !== actividad.sprint.proyectoId) {
      throw AppError.badRequest('El periodo de trabajo elegido no existe o pertenece a otro proyecto');
    }
  }

  return prisma.actividad.update({ where: { id }, data: normalizarAvance(data), include: includeActividad });
}

export async function eliminar(id: number) {
  await prisma.actividad.delete({ where: { id } });
}
