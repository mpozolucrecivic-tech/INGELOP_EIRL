import { EstadoEtapa, TipoEtapa, type Etapa } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import type { UsuarioAutenticado } from '../../types/express';
import type { EditarEtapaInput, IniciarEtapaInput } from './etapas.schema';

/** Orden fijo de las etapas de un proyecto */
export const ORDEN_ETAPAS: TipoEtapa[] = [TipoEtapa.PREINVERSION, TipoEtapa.EXPEDIENTE_TECNICO, TipoEtapa.SUPERVISION, TipoEtapa.LIQUIDACION];
const posicion = (t: TipoEtapa) => ORDEN_ETAPAS.indexOf(t);
const NOMBRE: Record<TipoEtapa, string> = {
  PREINVERSION: 'preinversión',
  EXPEDIENTE_TECNICO: 'expediente técnico',
  SUPERVISION: 'supervisión',
  LIQUIDACION: 'liquidación',
};

const incluir = { observadoPor: { select: { id: true, nombre: true } } } as const;

/** Etapas del proyecto en su orden. El estado lo ven todos los asignados al proyecto. */
export async function listar(proyectoId: number) {
  const etapas = await prisma.etapa.findMany({ where: { proyectoId }, include: incluir });
  return etapas.sort((a, b) => posicion(a.tipo) - posicion(b.tipo));
}

async function buscar(id: number) {
  const etapa = await prisma.etapa.findUnique({ where: { id } });
  if (!etapa) throw AppError.notFound('Etapa no encontrada');
  return etapa;
}

/** ¿Existe una etapa posterior a esta en el mismo proyecto? */
async function tienePosterior(etapa: Etapa) {
  const otras = await prisma.etapa.findMany({ where: { proyectoId: etapa.proyectoId }, select: { tipo: true } });
  return otras.some((o) => posicion(o.tipo) > posicion(etapa.tipo));
}

/**
 * Inicia una etapa. Regla: la primera puede ser cualquiera; las siguientes solo si la última
 * existente está APROBADA, y nunca una etapa anterior a otra ya iniciada.
 */
export async function iniciar(proyectoId: number, data: IniciarEtapaInput) {
  const existentes = await prisma.etapa.findMany({ where: { proyectoId } });
  if (existentes.some((e) => e.tipo === data.tipo)) throw AppError.conflict(`La etapa de ${NOMBRE[data.tipo]} ya fue iniciada`);
  const ultima = existentes.sort((a, b) => posicion(b.tipo) - posicion(a.tipo))[0];
  if (ultima) {
    if (posicion(data.tipo) < posicion(ultima.tipo)) {
      throw AppError.conflict(`No se puede volver a ${NOMBRE[data.tipo]}: el proyecto ya está en ${NOMBRE[ultima.tipo]}`);
    }
    if (ultima.estado !== EstadoEtapa.APROBADO) {
      throw AppError.conflict(`Para iniciar ${NOMBRE[data.tipo]}, primero debe aprobarse la etapa de ${NOMBRE[ultima.tipo]}`);
    }
  }
  if (data.fechaInicio && data.fechaFin && data.fechaFin < data.fechaInicio) {
    throw AppError.badRequest('La fecha de fin debe ser posterior a la de inicio');
  }
  return prisma.etapa.create({
    data: { proyectoId, tipo: data.tipo, ...(data.fechaInicio && { fechaInicio: data.fechaInicio }), fechaFin: data.fechaFin ?? null },
    include: incluir,
  });
}

export async function editarFechas(id: number, data: EditarEtapaInput) {
  const etapa = await buscar(id);
  const inicio = data.fechaInicio ?? etapa.fechaInicio;
  const fin = data.fechaFin === undefined ? etapa.fechaFin : data.fechaFin;
  if (fin && fin < inicio) throw AppError.badRequest('La fecha de fin debe ser posterior a la de inicio');
  return prisma.etapa.update({ where: { id }, data: { fechaInicio: inicio, fechaFin: fin }, include: incluir });
}

/** El responsable (cualquier asignado al proyecto) envía la etapa a revisión de la jefatura */
export async function enviarARevision(usuario: UsuarioAutenticado, id: number) {
  const etapa = await buscar(id);
  await assertProjectAccess(usuario, etapa.proyectoId);
  if (etapa.estado !== EstadoEtapa.EN_ELABORACION && etapa.estado !== EstadoEtapa.OBSERVADO) {
    throw AppError.conflict(etapa.estado === EstadoEtapa.EN_REVISION ? 'La etapa ya está en revisión' : 'La etapa ya está aprobada');
  }
  return prisma.etapa.update({ where: { id }, data: { estado: EstadoEtapa.EN_REVISION }, include: incluir });
}

export async function aprobar(id: number) {
  const etapa = await buscar(id);
  if (etapa.estado === EstadoEtapa.APROBADO) throw AppError.conflict('La etapa ya está aprobada');
  return prisma.etapa.update({
    where: { id },
    data: { estado: EstadoEtapa.APROBADO, fechaAprobacion: new Date(), observacion: null, observadoEn: null, observadoPorId: null },
    include: incluir,
  });
}

/** La jefatura observa con un comentario: el responsable corrige y vuelve a enviar */
export async function observar(id: number, observacion: string, jefaturaId: number) {
  const etapa = await buscar(id);
  if (etapa.estado === EstadoEtapa.APROBADO && (await tienePosterior(etapa))) {
    throw AppError.conflict('No se puede observar una etapa aprobada cuando ya se inició la siguiente');
  }
  return prisma.etapa.update({
    where: { id },
    data: { estado: EstadoEtapa.OBSERVADO, observacion, observadoEn: new Date(), observadoPorId: jefaturaId, fechaAprobacion: null },
    include: incluir,
  });
}

/** Solo la última etapa y sin documentos (para corregir un inicio por error) */
export async function eliminar(id: number) {
  const etapa = await buscar(id);
  if (await tienePosterior(etapa)) throw AppError.conflict('Solo se puede eliminar la última etapa del proyecto');
  if (await prisma.documento.count({ where: { etapaId: id } })) throw AppError.conflict('La etapa tiene documentos: elimínalos antes');
  await prisma.etapa.delete({ where: { id } });
}
