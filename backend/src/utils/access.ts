import { Prisma, Rol } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { UsuarioAutenticado } from '../types/express';
import { AppError } from './AppError';

/**
 * Filtro Prisma de los proyectos visibles para el usuario:
 * ADMIN ve todos; USUARIO solo aquellos donde está asignado o es responsable.
 */
export const filtroProyectosVisibles = (usuario: UsuarioAutenticado): Prisma.ProyectoWhereInput =>
  usuario.rol === Rol.ADMIN
    ? {}
    : { OR: [{ usuarios: { some: { usuarioId: usuario.id } } }, { responsableId: usuario.id }] };

/**
 * Verifica que el proyecto exista y que el usuario tenga acceso a él.
 * 404 si no existe; 403 si es un USUARIO no asignado.
 */
export async function assertProjectAccess(usuario: UsuarioAutenticado, proyectoId: number) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    select: {
      responsableId: true,
      usuarios: { where: { usuarioId: usuario.id }, select: { id: true } },
    },
  });

  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');
  if (usuario.rol === Rol.ADMIN) return;

  const asignado = proyecto.responsableId === usuario.id || proyecto.usuarios.length > 0;
  if (!asignado) throw AppError.forbidden('No tienes acceso a este proyecto');
}
