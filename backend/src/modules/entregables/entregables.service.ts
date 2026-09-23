import { EstadoRevision } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import type { ActualizarEntregableInput, CrearEntregableInput } from './entregables.schema';

/** Contenido típico de un expediente técnico de obra (Perú) */
export const PLANTILLA_EXPEDIENTE = [
  'Memoria descriptiva',
  'Estudio topográfico',
  'Estudio de mecánica de suelos',
  'Planos de arquitectura',
  'Planos de estructuras',
  'Planos de instalaciones sanitarias',
  'Planos de instalaciones eléctricas',
  'Especificaciones técnicas',
  'Planilla de metrados',
  'Análisis de costos unitarios',
  'Presupuesto de obra',
  'Fórmula polinómica',
  'Cronograma de ejecución de obra',
  'Panel fotográfico',
];

const include = { responsable: { select: { id: true, nombre: true } } } as const;

/** Vencido: pasó la fecha límite y aún no está aprobado */
const conVencimiento = <T extends { fechaLimite: Date | null; estado: EstadoRevision }>(e: T, hoy = new Date()) => ({
  ...e,
  vencido: !!e.fechaLimite && e.estado !== EstadoRevision.APROBADO && e.fechaLimite < new Date(hoy.toISOString().slice(0, 10)),
});

async function assertResponsable(id: number | null | undefined) {
  if (!id) return;
  const u = await prisma.usuario.findUnique({ where: { id }, select: { activo: true } });
  if (!u || !u.activo) throw AppError.badRequest('responsableId: el usuario no existe o está inactivo');
}

export async function listarPorProyecto(proyectoId: number) {
  const entregables = await prisma.entregable.findMany({
    where: { proyectoId },
    include,
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
  });
  return entregables.map((e) => conVencimiento(e));
}

export async function crear(proyectoId: number, data: CrearEntregableInput) {
  await assertResponsable(data.responsableId);
  const ultimo = await prisma.entregable.aggregate({ where: { proyectoId }, _max: { orden: true } });
  const creado = await prisma.entregable.create({
    data: { ...data, proyectoId, orden: (ultimo._max.orden ?? -1) + 1 },
    include,
  });
  return conVencimiento(creado);
}

/** Agrega los entregables estándar que el proyecto aún no tenga (por nombre) */
export async function aplicarPlantilla(proyectoId: number) {
  const existentes = await prisma.entregable.findMany({ where: { proyectoId }, select: { nombre: true, orden: true } });
  const nombres = new Set(existentes.map((e) => e.nombre.toLowerCase()));
  let orden = existentes.reduce((m, e) => Math.max(m, e.orden), -1) + 1;
  const nuevos = PLANTILLA_EXPEDIENTE.filter((n) => !nombres.has(n.toLowerCase())).map((nombre) => ({
    proyectoId,
    nombre,
    orden: orden++,
  }));
  if (nuevos.length) await prisma.entregable.createMany({ data: nuevos });
  return { agregados: nuevos.length, entregables: await listarPorProyecto(proyectoId) };
}

export async function actualizar(id: number, data: ActualizarEntregableInput) {
  await assertResponsable(data.responsableId);
  const actual = await prisma.entregable.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Entregable no encontrado');

  // Al aprobar sin fecha de entrega se registra la fecha de hoy
  const fechaEntrega =
    data.estado === EstadoRevision.APROBADO && data.fechaEntrega === undefined && !actual.fechaEntrega
      ? new Date(new Date().toISOString().slice(0, 10))
      : data.fechaEntrega;

  const actualizado = await prisma.entregable.update({ where: { id }, data: { ...data, fechaEntrega }, include });
  return conVencimiento(actualizado);
}

export async function eliminar(id: number) {
  await prisma.entregable.delete({ where: { id } });
}
