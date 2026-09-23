import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { ActualizarClienteInput, CrearClienteInput, ListarClientesQuery } from './clientes.schema';

export function listar(filtros: ListarClientesQuery) {
  const where: Prisma.ClienteWhereInput = {
    ...(filtros.activo !== undefined && { activo: filtros.activo }),
    ...(filtros.q && {
      OR: [
        { nombre: { contains: filtros.q, mode: 'insensitive' } },
        { documento: { contains: filtros.q } },
        { contacto: { contains: filtros.q, mode: 'insensitive' } },
      ],
    }),
  };
  return prisma.cliente.findMany({
    where,
    include: { _count: { select: { proyectos: true } } },
    orderBy: { nombre: 'asc' },
  });
}

export async function obtener(id: number) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      proyectos: {
        select: { id: true, nombre: true, estado: true, tipoServicio: true, montoContrato: true, fechaInicio: true, fechaFin: true },
        orderBy: { fechaInicio: 'desc' },
      },
    },
  });
  if (!cliente) throw AppError.notFound('Cliente no encontrado');
  return cliente;
}

export function crear(data: CrearClienteInput) {
  return prisma.cliente.create({ data }); // documento duplicado -> P2002 -> 409
}

export function actualizar(id: number, data: ActualizarClienteInput) {
  return prisma.cliente.update({ where: { id }, data });
}

/** Solo se pueden eliminar clientes sin proyectos; los demás se desactivan */
export async function eliminar(id: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id }, include: { _count: { select: { proyectos: true } } } });
  if (!cliente) throw AppError.notFound('Cliente no encontrado');
  if (cliente._count.proyectos > 0) {
    throw AppError.conflict('El cliente tiene proyectos registrados; desactívalo en lugar de eliminarlo');
  }
  await prisma.cliente.delete({ where: { id } });
}
