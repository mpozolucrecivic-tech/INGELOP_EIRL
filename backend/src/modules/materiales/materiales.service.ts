import { Prisma, TipoMovimiento } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { round2, toNumber } from '../../utils/helpers';
import type { ActualizarMaterialInput, CrearMaterialInput, CrearMovimientoInput } from './materiales.schema';

type MaterialRow = { stockActual: Prisma.Decimal; stockMinimo: Prisma.Decimal };

/** Agrega el indicador de alerta (stock actual <= stock mínimo) */
const conAlerta = <T extends MaterialRow>(m: T) => ({
  ...m,
  enAlerta: m.stockActual.lte(m.stockMinimo),
  faltante: round2(Math.max(0, toNumber(m.stockMinimo) - toNumber(m.stockActual))),
});

export async function listarPorProyecto(proyectoId: number) {
  const materiales = await prisma.material.findMany({ where: { proyectoId }, orderBy: { nombre: 'asc' } });
  return materiales.map(conAlerta);
}

/** Materiales con stock actual menor o igual al mínimo (comparación columna contra columna en BD) */
export async function alertasPorProyecto(proyectoId: number) {
  const materiales = await prisma.material.findMany({
    where: { proyectoId, stockActual: { lte: prisma.material.fields.stockMinimo } },
    orderBy: { nombre: 'asc' },
  });
  return materiales.map(conAlerta);
}

export async function crear(proyectoId: number, usuarioId: number, data: CrearMaterialInput) {
  const { stockInicial, ...material } = data;

  return prisma.$transaction(async (tx) => {
    const creado = await tx.material.create({
      data: { ...material, proyectoId, stockActual: stockInicial ?? 0 },
    });
    if (stockInicial && stockInicial > 0) {
      await tx.movimientoMaterial.create({
        data: {
          materialId: creado.id,
          tipo: TipoMovimiento.ENTRADA,
          cantidad: stockInicial,
          observacion: 'Stock inicial',
          usuarioId,
        },
      });
    }
    return conAlerta(creado);
  });
}

export async function actualizar(id: number, data: ActualizarMaterialInput) {
  const material = await prisma.material.update({ where: { id }, data });
  return conAlerta(material);
}

/** Obtiene el proyecto al que pertenece un material (404 si no existe) */
export async function proyectoDeMaterial(id: number) {
  const material = await prisma.material.findUnique({ where: { id }, select: { proyectoId: true } });
  if (!material) throw AppError.notFound('Material no encontrado');
  return material.proyectoId;
}

export async function listarMovimientos(materialId: number) {
  await proyectoDeMaterial(materialId);
  return prisma.movimientoMaterial.findMany({
    where: { materialId },
    include: { usuario: { select: { id: true, nombre: true } } },
    orderBy: { fecha: 'desc' },
  });
}

/**
 * Registra una ENTRADA o SALIDA y actualiza el stock en una sola transacción.
 * La SALIDA usa un update condicional (stockActual >= cantidad) para que el stock
 * nunca quede negativo, incluso con peticiones concurrentes. Stock insuficiente -> 409.
 */
export async function registrarMovimiento(materialId: number, usuarioId: number, data: CrearMovimientoInput) {
  return prisma.$transaction(async (tx) => {
    const material = await tx.material.findUnique({ where: { id: materialId } });
    if (!material) throw AppError.notFound('Material no encontrado');

    if (data.tipo === TipoMovimiento.ENTRADA) {
      await tx.material.update({ where: { id: materialId }, data: { stockActual: { increment: data.cantidad } } });
    } else {
      const { count } = await tx.material.updateMany({
        where: { id: materialId, stockActual: { gte: data.cantidad } },
        data: { stockActual: { decrement: data.cantidad } },
      });
      if (count === 0) {
        const actual = await tx.material.findUniqueOrThrow({ where: { id: materialId }, select: { stockActual: true } });
        throw AppError.conflict('Stock insuficiente para registrar la salida', {
          stockActual: toNumber(actual.stockActual),
          solicitado: data.cantidad,
          unidad: material.unidad,
        });
      }
    }

    const movimiento = await tx.movimientoMaterial.create({
      data: { materialId, usuarioId, tipo: data.tipo, cantidad: data.cantidad, fecha: data.fecha, observacion: data.observacion },
    });
    const actualizado = await tx.material.findUniqueOrThrow({ where: { id: materialId } });

    return { movimiento, material: conAlerta(actualizado) };
  });
}
