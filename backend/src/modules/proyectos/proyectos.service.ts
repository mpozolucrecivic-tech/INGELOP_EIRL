import { Prisma, Rol } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { storage } from '../../config/storage';
import { AppError } from '../../utils/AppError';
import { filtroProyectosVisibles } from '../../utils/access';
import type { UsuarioAutenticado } from '../../types/express';
import type { ActualizarProyectoInput, CrearProyectoInput, ListarProyectosQuery } from './proyectos.schema';

const responsableSelect = { select: { id: true, nombre: true, email: true } } as const;
const clienteSelect = { select: { id: true, nombre: true, tipo: true } } as const;

async function assertClienteActivo(id: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id }, select: { activo: true } });
  if (!cliente || !cliente.activo) throw AppError.badRequest('clienteId: el cliente no existe o está inactivo');
}

async function assertUsuarioActivo(id: number, campo = 'responsableId') {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
  if (!usuario || !usuario.activo) throw AppError.badRequest(`${campo}: el usuario no existe o está inactivo`);
}

export function listar(usuario: UsuarioAutenticado, filtros: ListarProyectosQuery) {
  const where: Prisma.ProyectoWhereInput = {
    AND: [
      filtroProyectosVisibles(usuario),
      filtros.estado ? { estado: filtros.estado } : {},
      filtros.clienteId ? { clienteId: filtros.clienteId } : {},
      filtros.rubro ? { rubro: filtros.rubro } : {},
      filtros.q
        ? {
            OR: [
              { nombre: { contains: filtros.q, mode: 'insensitive' } },
              { cliente: { nombre: { contains: filtros.q, mode: 'insensitive' } } },
              { ubicacion: { contains: filtros.q, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  };

  return prisma.proyecto.findMany({
    where,
    include: {
      responsable: responsableSelect,
      cliente: clienteSelect,
      _count: { select: { sprints: true, evidencias: true, usuarios: true, planos: true, entregables: true } },
    },
    orderBy: { fechaInicio: 'desc' },
  });
}

/** El acceso ya fue verificado por requireProjectAccess */
export async function obtener(id: number) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: {
      responsable: responsableSelect,
      cliente: clienteSelect,
      usuarios: { select: { usuario: { select: { id: true, nombre: true, email: true, rol: true } } } },
      _count: {
        select: { sprints: true, gastos: true, evidencias: true, asignaciones: true, planos: true, presupuestos: true, entregables: true },
      },
    },
  });
  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');

  const { usuarios, ...resto } = proyecto;
  return { ...resto, usuarios: usuarios.map((u) => u.usuario) };
}

export async function crear(data: CrearProyectoInput) {
  await assertUsuarioActivo(data.responsableId);
  await assertClienteActivo(data.clienteId);
  return prisma.proyecto.create({ data, include: { responsable: responsableSelect, cliente: clienteSelect } });
}

export async function actualizar(id: number, data: ActualizarProyectoInput) {
  const actual = await prisma.proyecto.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Proyecto no encontrado');

  // Valida coherencia de fechas contra los valores ya guardados
  const inicio = data.fechaInicio ?? actual.fechaInicio;
  const fin = data.fechaFin ?? actual.fechaFin;
  if (fin < inicio) throw AppError.badRequest('fechaFin debe ser posterior o igual a fechaInicio');

  if (data.responsableId) await assertUsuarioActivo(data.responsableId);
  if (data.clienteId && data.clienteId !== actual.clienteId) await assertClienteActivo(data.clienteId);

  return prisma.proyecto.update({ where: { id }, data, include: { responsable: responsableSelect, cliente: clienteSelect } });
}

/** Elimina el proyecto con todos sus datos (cascade) y sus archivos subidos */
export async function eliminar(id: number) {
  await prisma.proyecto.delete({ where: { id } });
  await storage.removePrefix(`proyectos/${id}`);
}

// ---------- Usuarios asignados a la obra (UsuarioProyecto) ----------

export async function listarUsuarios(proyectoId: number) {
  const filas = await prisma.usuarioProyecto.findMany({
    where: { proyectoId },
    select: { usuario: { select: { id: true, nombre: true, email: true, rol: true, activo: true } } },
    orderBy: { usuario: { nombre: 'asc' } },
  });
  return filas.map((f) => f.usuario);
}

export async function asignarUsuario(proyectoId: number, usuarioId: number) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario || !usuario.activo) throw AppError.badRequest('El usuario no existe o está inactivo');
  if (usuario.rol === Rol.ADMIN) throw AppError.badRequest('Los administradores ya tienen acceso a todos los proyectos');

  await prisma.usuarioProyecto.create({ data: { proyectoId, usuarioId } }); // P2002 -> 409 si ya estaba asignado
  return listarUsuarios(proyectoId);
}

export async function desasignarUsuario(proyectoId: number, usuarioId: number) {
  const { count } = await prisma.usuarioProyecto.deleteMany({ where: { proyectoId, usuarioId } });
  if (count === 0) throw AppError.notFound('El usuario no está asignado a este proyecto');
}
