import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { filtroFechas, round2, toNumber } from '../../utils/helpers';
import type {
  ActualizarTrabajadorInput,
  CrearAsignacionInput,
  CrearRegistroHorasInput,
  CrearTrabajadorInput,
  ListarRegistrosQuery,
  ListarTrabajadoresQuery,
} from './personal.schema';

// ---------- Trabajadores ----------

export function listarTrabajadores(filtros: ListarTrabajadoresQuery) {
  const where: Prisma.TrabajadorWhereInput = {
    ...(filtros.activo !== undefined && { activo: filtros.activo }),
    ...(filtros.q && {
      OR: [
        { nombre: { contains: filtros.q, mode: 'insensitive' } },
        { dni: { contains: filtros.q } },
        { cargo: { contains: filtros.q, mode: 'insensitive' } },
      ],
    }),
  };
  return prisma.trabajador.findMany({
    where,
    include: {
      // Asignaciones vigentes (sin fecha de fin o con fin futuro)
      asignaciones: {
        where: { OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] },
        select: { id: true, fechaInicio: true, fechaFin: true, proyecto: { select: { id: true, nombre: true } } },
      },
    },
    orderBy: { nombre: 'asc' },
  });
}

export function crearTrabajador(data: CrearTrabajadorInput) {
  return prisma.trabajador.create({ data }); // DNI duplicado -> P2002 -> 409
}

export function actualizarTrabajador(id: number, data: ActualizarTrabajadorInput) {
  return prisma.trabajador.update({ where: { id }, data });
}

// ---------- Asignaciones ----------

export function listarAsignaciones(proyectoId: number) {
  return prisma.asignacion.findMany({
    where: { proyectoId },
    include: { trabajador: { select: { id: true, dni: true, nombre: true, cargo: true, costoHora: true, activo: true } } },
    orderBy: [{ fechaFin: { sort: 'asc', nulls: 'first' } }, { fechaInicio: 'desc' }],
  });
}

export async function crearAsignacion(proyectoId: number, data: CrearAsignacionInput) {
  const trabajador = await prisma.trabajador.findUnique({ where: { id: data.trabajadorId } });
  if (!trabajador || !trabajador.activo) throw AppError.badRequest('trabajadorId: el trabajador no existe o está inactivo');

  // Evita dos asignaciones del mismo trabajador al mismo proyecto con periodos superpuestos
  const solapada = await prisma.asignacion.findFirst({
    where: {
      proyectoId,
      trabajadorId: data.trabajadorId,
      ...(data.fechaFin && { fechaInicio: { lte: data.fechaFin } }),
      OR: [{ fechaFin: null }, { fechaFin: { gte: data.fechaInicio } }],
    },
  });
  if (solapada) throw AppError.conflict('El trabajador ya tiene una asignación vigente en este proyecto para ese periodo');

  return prisma.asignacion.create({
    data: { ...data, proyectoId },
    include: { trabajador: { select: { id: true, nombre: true, cargo: true } } },
  });
}

export async function cerrarAsignacion(id: number, fechaFin: Date) {
  const asignacion = await prisma.asignacion.findUnique({ where: { id } });
  if (!asignacion) throw AppError.notFound('Asignación no encontrada');
  if (fechaFin < asignacion.fechaInicio) throw AppError.badRequest('fechaFin debe ser posterior o igual a fechaInicio');
  return prisma.asignacion.update({ where: { id }, data: { fechaFin } });
}

// ---------- Registro de horas ----------

const MAX_HORAS_DIA = 24;

/**
 * Registra horas de un profesional en el proyecto. Reglas:
 * - debe estar asignado al proyecto en esa fecha;
 * - la suma de sus horas del día (en todos los proyectos) no puede superar 24.
 */
export async function registrarHoras(proyectoId: number, data: CrearRegistroHorasInput) {
  const asignacion = await prisma.asignacion.findFirst({
    where: {
      trabajadorId: data.trabajadorId,
      proyectoId,
      fechaInicio: { lte: data.fecha },
      OR: [{ fechaFin: null }, { fechaFin: { gte: data.fecha } }],
    },
  });
  if (!asignacion) throw AppError.conflict('El profesional no está asignado a este proyecto en la fecha indicada');

  const delDia = await prisma.registroHoras.aggregate({
    where: { trabajadorId: data.trabajadorId, fecha: data.fecha },
    _sum: { horas: true },
  });
  const acumuladas = toNumber(delDia._sum.horas);
  if (acumuladas + data.horas > MAX_HORAS_DIA) {
    throw AppError.conflict(`El profesional ya tiene ${acumuladas} h registradas ese día (máximo ${MAX_HORAS_DIA} h)`);
  }

  return prisma.registroHoras.create({
    data: { ...data, proyectoId },
    include: { trabajador: { select: { id: true, nombre: true, cargo: true } } },
  });
}

export function listarRegistros(proyectoId: number, filtros: ListarRegistrosQuery) {
  return prisma.registroHoras.findMany({
    where: {
      proyectoId,
      ...(filtros.trabajadorId && { trabajadorId: filtros.trabajadorId }),
      fecha: filtroFechas(filtros.desde, filtros.hasta),
    },
    include: { trabajador: { select: { id: true, nombre: true, cargo: true } } },
    orderBy: [{ fecha: 'desc' }, { creadoEn: 'desc' }],
  });
}

export async function eliminarRegistro(id: number) {
  await prisma.registroHoras.delete({ where: { id } });
}

/**
 * Resumen de horas-hombre y costo por profesional.
 * El costo usa el costoHora actual del profesional.
 */
export async function resumenHoras(proyectoId: number, desde?: Date, hasta?: Date) {
  const registros = await prisma.registroHoras.findMany({
    where: { proyectoId, fecha: filtroFechas(desde, hasta) },
    include: { trabajador: { select: { id: true, nombre: true, cargo: true, costoHora: true } } },
  });

  const porTrabajador = new Map<
    number,
    { trabajadorId: number; nombre: string; cargo: string; costoHora: number; dias: Set<string>; horas: number; costo: number }
  >();

  for (const r of registros) {
    const t = r.trabajador;
    const fila = porTrabajador.get(t.id) ?? {
      trabajadorId: t.id,
      nombre: t.nombre,
      cargo: t.cargo,
      costoHora: toNumber(t.costoHora),
      dias: new Set<string>(),
      horas: 0,
      costo: 0,
    };
    const horas = toNumber(r.horas);
    fila.dias.add(r.fecha.toISOString().slice(0, 10));
    fila.horas = round2(fila.horas + horas);
    fila.costo = round2(fila.costo + horas * fila.costoHora);
    porTrabajador.set(t.id, fila);
  }

  const trabajadores = [...porTrabajador.values()]
    .map(({ dias, ...t }) => ({ ...t, diasTrabajados: dias.size }))
    .sort((a, b) => b.horas - a.horas);

  return {
    proyectoId,
    desde: desde ?? null,
    hasta: hasta ?? null,
    totalHoras: round2(trabajadores.reduce((s, t) => s + t.horas, 0)),
    costoTotal: round2(trabajadores.reduce((s, t) => s + t.costo, 0)),
    trabajadores,
  };
}
