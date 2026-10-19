import { Prisma, type MensajeContacto } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../../config/env';
import { enviarEnSegundoPlano, escaparHtml } from '../../config/mailer';
import { prisma } from '../../config/prisma';
import type { ActualizarMensajeInput, CrearMensajeInput, ListarMensajesQuery } from './contacto.schema';

const TIPOS: Record<string, string> = { CONTACTO: 'Contacto', CONSULTA_TECNICA: 'Consulta técnica' };

/**
 * Guarda un mensaje del formulario de la web.
 * Devuelve false si era un bot (campo trampa lleno): no se guarda, pero se le responde igual que a una persona.
 */
export async function crear({ sitio_web, servicio, ...data }: CrearMensajeInput, ip: string | undefined) {
  if (sitio_web) return false;

  const servicioElegido = servicio
    ? await prisma.servicio.findFirst({ where: { slug: servicio, activo: true }, select: { nombre: true } })
    : null;
  if (servicio && !servicioElegido) {
    // Mismo formato 422 que el middleware validate
    throw new ZodError([{ code: 'custom', path: ['body', 'servicio'], message: 'Selecciona un servicio de la lista.' }]);
  }

  const mensaje = await prisma.mensajeContacto.create({ data: { ...data, servicioSlug: servicio, ip } });
  // El mensaje ya está guardado: si el correo falla, no se pierde ni se demora la respuesta
  if (env.CONTACTO_EMAIL) enviarEnSegundoPlano(avisoMensaje(mensaje, servicioElegido?.nombre ?? null), `aviso del mensaje ${mensaje.id}`);
  return true;
}

/** Correo a la empresa con el mensaje completo; "Responder" va directo a quien escribió */
function avisoMensaje(m: MensajeContacto, servicioNombre: string | null) {
  const filas: [string, string | null][] = [
    ['Nombre', m.nombre],
    ['Correo', m.correo],
    ['Teléfono', m.telefono],
    ['Entidad / empresa', m.entidad],
    ['Tipo', TIPOS[m.tipo] ?? m.tipo],
    ['Servicio de interés', servicioNombre],
  ];
  const visibles = filas.filter((f): f is [string, string] => !!f[1]);
  const enlace = env.INTRANET_URL ? `${env.INTRANET_URL}/mensajes` : null;
  const pie = 'Responde a este correo para contestarle directamente.';
  return {
    para: env.CONTACTO_EMAIL!,
    responderA: m.correo,
    // Sin saltos de línea en el asunto (el nombre viene de un formulario público)
    asunto: `Nuevo mensaje de la web: ${m.nombre.replace(/[\r\n]+/g, ' ').slice(0, 80)}`,
    texto: [
      'Llegó un mensaje desde el formulario de contacto de la web.',
      '',
      ...visibles.map(([k, v]) => `${k}: ${v}`),
      '',
      m.mensaje,
      '',
      pie,
      ...(enlace ? [`También puedes verlo en la intranet: ${enlace}`] : []),
    ].join('\n'),
    html: `<p>Llegó un mensaje desde el formulario de contacto de la web.</p>
<table cellpadding="4" style="border-collapse:collapse;font-size:14px">${visibles
      .map(([k, v]) => `<tr><td style="color:#64748b">${escaparHtml(k)}</td><td><strong>${escaparHtml(v)}</strong></td></tr>`)
      .join('')}</table>
<p style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:8px;font-size:14px">${escaparHtml(m.mensaje)}</p>
<p style="color:#64748b;font-size:13px">${pie}${enlace ? ` También puedes verlo en la <a href="${escaparHtml(enlace)}">intranet</a>.` : ''}</p>`,
  };
}

export async function listar(filtros: ListarMensajesQuery) {
  const where: Prisma.MensajeContactoWhereInput = {
    ...(filtros.tipo && { tipo: filtros.tipo }),
    ...(filtros.leido !== undefined && { leido: filtros.leido }),
    ...(filtros.estado === 'PENDIENTES' ? { estado: { not: 'ARCHIVADO' } } : filtros.estado && { estado: filtros.estado }),
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

/** Estado y nota interna. Al pasar a RESPONDIDO guarda la fecha; cambiar el estado también lo marca como leído */
export async function actualizar(id: number, { estado, nota }: ActualizarMensajeInput) {
  const actual = await prisma.mensajeContacto.findUniqueOrThrow({ where: { id }, select: { estado: true } }); // P2025 -> 404
  return prisma.mensajeContacto.update({
    where: { id },
    data: {
      ...(nota !== undefined && { nota }),
      ...(estado && {
        estado,
        leido: true,
        ...(estado === 'RESPONDIDO' && actual.estado !== 'RESPONDIDO' && { respondidoEn: new Date() }),
        ...(estado === 'NUEVO' && { respondidoEn: null }),
      }),
    },
  });
}

export async function eliminar(id: number) {
  await prisma.mensajeContacto.delete({ where: { id } }); // inexistente -> P2025 -> 404
}
