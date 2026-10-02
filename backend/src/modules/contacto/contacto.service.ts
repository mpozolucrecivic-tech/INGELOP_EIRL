import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../../config/prisma';
import type { CrearMensajeInput, ListarMensajesQuery } from './contacto.schema';

/**
 * Guarda un mensaje del formulario de la web.
 * Devuelve false si era un bot (campo trampa lleno): no se guarda, pero se le responde igual que a una persona.
 */
export async function crear({ sitio_web, servicio, ...data }: CrearMensajeInput, ip: string | undefined) {
  if (sitio_web) return false;

  if (servicio && !(await prisma.servicio.findFirst({ where: { slug: servicio, activo: true }, select: { id: true } }))) {
    // Mismo formato 422 que el middleware validate
    throw new ZodError([{ code: 'custom', path: ['body', 'servicio'], message: 'Selecciona un servicio de la lista.' }]);
  }

  await prisma.mensajeContacto.create({ data: { ...data, servicioSlug: servicio, ip } });
  return true;
}

export async function listar(filtros: ListarMensajesQuery) {
  const where: Prisma.MensajeContactoWhereInput = {
    ...(filtros.tipo && { tipo: filtros.tipo }),
    ...(filtros.leido !== undefined && { leido: filtros.leido }),
    ...(filtros.q && {
      OR: [
        { nombre: { contains: filtros.q, mode: 'insensitive' } },
        { correo: { contains: filtros.q, mode: 'insensitive' } },
        { entidad: { contains: filtros.q, mode: 'insensitive' } },
        { mensaje: { contains: filtros.q, mode: 'insensitive' } },
      ],
    }),
  };
  const mensajes = await prisma.mensajeContacto.findMany({ where, orderBy: { fecha: 'desc' } });

  // Nombre legible del servicio de interés (el slug se guarda sin FK)
  const slugs = [...new Set(mensajes.map((m) => m.servicioSlug).filter((s): s is string => !!s))];
  const servicios = slugs.length
    ? await prisma.servicio.findMany({ where: { slug: { in: slugs } }, select: { slug: true, nombre: true } })
    : [];
  const nombres = new Map(servicios.map((s) => [s.slug, s.nombre]));
  return mensajes.map((m) => ({ ...m, servicioNombre: m.servicioSlug ? (nombres.get(m.servicioSlug) ?? m.servicioSlug) : null }));
}

export async function marcarLeido(id: number, leido: boolean) {
  return prisma.mensajeContacto.update({ where: { id }, data: { leido } }); // inexistente -> P2025 -> 404
}
