import { EstadoProyecto, EstadoRevision, Rol } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { ListarNotificacionesQuery } from './notificaciones.schema';

export interface NuevaNotificacion {
  tipo: string;
  titulo: string;
  mensaje?: string | null;
  enlace?: string | null;
  /** Para recordatorios automáticos: con la misma clave no se repite (se le agrega el destinatario) */
  clave?: string;
}

const RETENCION_DIAS = 90;
const AVISO_ENTREGABLE_DIAS = 3; // recordar los entregables que vencen dentro de estos días
const MANTENIMIENTO_CADA_MS = 60 * 60_000;

/**
 * Crea la notificación para cada destinatario activo (sin repetir y sin avisarle a quien hizo la acción).
 * Devuelve cuántas se crearon.
 */
export async function notificar(destinatarios: Iterable<number | null | undefined>, n: NuevaNotificacion, actorId?: number) {
  const ids = [...new Set([...destinatarios].filter((id): id is number => typeof id === 'number' && id !== actorId))];
  if (!ids.length) return 0;
  const activos = await prisma.usuario.findMany({ where: { id: { in: ids }, activo: true }, select: { id: true } });
  const { count } = await prisma.notificacion.createMany({
    data: activos.map((u) => ({ usuarioId: u.id, tipo: n.tipo, titulo: n.titulo, mensaje: n.mensaje, enlace: n.enlace, clave: n.clave ? `${n.clave}:u${u.id}` : null })),
    skipDuplicates: true,
  });
  return count;
}

/** Los avisos nunca deben hacer fallar la acción que los origina */
export function enSegundoPlano(fn: () => Promise<unknown>, contexto: string) {
  fn().catch((e: unknown) => console.error(`[NOTIFICACIONES] No se pudo notificar (${contexto}):`, e instanceof Error ? e.message : e));
}

export async function jefaturas() {
  return (await prisma.usuario.findMany({ where: { rol: Rol.ADMIN, activo: true }, select: { id: true } })).map((u) => u.id);
}

/** Responsable del proyecto y usuarios con acceso */
export async function equipoProyecto(proyectoId: number) {
  const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { responsableId: true, usuarios: { select: { usuarioId: true } } } });
  return p ? [p.responsableId, ...p.usuarios.map((u) => u.usuarioId)] : [];
}

// ---------- Bandeja de cada usuario ----------

export async function listar(usuarioId: number, { soloNoLeidas, limite }: ListarNotificacionesQuery) {
  await mantenimiento();
  const [notificaciones, noLeidas] = await Promise.all([
    prisma.notificacion.findMany({
      where: { usuarioId, ...(soloNoLeidas && { leidaEn: null }) },
      orderBy: { id: 'desc' },
      take: limite,
      select: { id: true, tipo: true, titulo: true, mensaje: true, enlace: true, leidaEn: true, creadoEn: true },
    }),
    prisma.notificacion.count({ where: { usuarioId, leidaEn: null } }),
  ]);
  return { noLeidas, notificaciones };
}

export async function contador(usuarioId: number) {
  await mantenimiento();
  return { noLeidas: await prisma.notificacion.count({ where: { usuarioId, leidaEn: null } }) };
}

/** Solo las propias: la de otro usuario responde 404, igual que una inexistente */
export async function marcarLeida(usuarioId: number, id: number) {
  const n = await prisma.notificacion.findFirst({ where: { id, usuarioId }, select: { leidaEn: true } });
  if (!n) throw AppError.notFound('Notificación no encontrada');
  if (!n.leidaEn) await prisma.notificacion.update({ where: { id }, data: { leidaEn: new Date() } });
}

export async function marcarTodas(usuarioId: number) {
  const { count } = await prisma.notificacion.updateMany({ where: { usuarioId, leidaEn: null }, data: { leidaEn: new Date() } });
  return { marcadas: count };
}

// ---------- Recordatorios y limpieza ----------

let ultimoMantenimiento = 0;
let enCurso: Promise<void> | null = null;

/**
 * Como mucho una vez por hora (se dispara al consultar la campana): crea los recordatorios de
 * entregables y borra las notificaciones antiguas. Sin tareas programadas aparte.
 */
export function mantenimiento(forzar = false): Promise<void> {
  if (!forzar && Date.now() - ultimoMantenimiento < MANTENIMIENTO_CADA_MS) return Promise.resolve();
  enCurso ??= (async () => {
    try {
      await recordarEntregables();
      await prisma.notificacion.deleteMany({ where: { creadoEn: { lt: new Date(Date.now() - RETENCION_DIAS * 86_400_000) } } });
      ultimoMantenimiento = Date.now();
    } catch (e) {
      console.error('[NOTIFICACIONES] Falló el mantenimiento:', e instanceof Error ? e.message : e);
    } finally {
      enCurso = null;
    }
  })();
  return enCurso;
}

/** Fecha de hoy en Perú como Date UTC a medianoche (igual que las columnas @db.Date) */
export function hoyEnLima(ahora = new Date()) {
  return new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(ahora)}T00:00:00.000Z`);
}

const fechaCorta = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/');

/** Entregables sin aprobar que vencen pronto o ya vencieron: al responsable, o a la jefatura si no tiene */
async function recordarEntregables() {
  const hoy = hoyEnLima();
  const limite = new Date(hoy.getTime() + AVISO_ENTREGABLE_DIAS * 86_400_000);
  const entregables = await prisma.entregable.findMany({
    where: {
      estado: { not: EstadoRevision.APROBADO },
      fechaLimite: { not: null, lte: limite },
      proyecto: { estado: { not: EstadoProyecto.FINALIZADA } },
    },
    select: { id: true, nombre: true, fechaLimite: true, responsableId: true, proyecto: { select: { id: true, nombre: true } } },
  });
  if (!entregables.length) return;
  const jefes = await jefaturas();
  for (const e of entregables) {
    const fecha = e.fechaLimite!;
    const vencido = fecha < hoy;
    const iso = fecha.toISOString().slice(0, 10);
    await notificar(e.responsableId ? [e.responsableId] : jefes, {
      tipo: vencido ? 'ENTREGABLE_VENCIDO' : 'ENTREGABLE_POR_VENCER',
      titulo: vencido ? `Entregable vencido: ${e.nombre}` : `Entregable por vencer: ${e.nombre}`,
      mensaje: `${e.proyecto.nombre} · ${vencido ? 'venció' : 'vence'} el ${fechaCorta(fecha)}`,
      enlace: `/proyectos/${e.proyecto.id}/expediente/entregables`,
      // Un aviso "por vencer" y otro "vencido" por cada fecha límite (si la cambian, se vuelve a avisar)
      clave: `entregable:${e.id}:${vencido ? 'vencido' : 'vence'}:${iso}`,
    });
  }
}
