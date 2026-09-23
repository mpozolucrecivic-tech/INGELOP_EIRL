import { CategoriaGasto } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { claveMes, filtroFechas, porcentaje, round2, toNumber } from '../../utils/helpers';
import type { ActualizarGastoInput, CrearGastoInput, ListarGastosQuery } from './gastos.schema';

export function listarPorProyecto(proyectoId: number, filtros: ListarGastosQuery) {
  return prisma.gasto.findMany({
    where: {
      proyectoId,
      ...(filtros.categoria && { categoria: filtros.categoria }),
      fecha: filtroFechas(filtros.desde, filtros.hasta),
    },
    orderBy: { fecha: 'desc' },
  });
}

export function crear(proyectoId: number, data: CrearGastoInput) {
  return prisma.gasto.create({ data: { ...data, proyectoId } });
}

export function actualizar(id: number, data: ActualizarGastoInput) {
  return prisma.gasto.update({ where: { id }, data });
}

export async function eliminar(id: number) {
  await prisma.gasto.delete({ where: { id } });
}

/**
 * Resumen financiero del proyecto: gastos propios frente al monto del contrato (honorarios),
 * por categoría y por mes. El saldo es el margen que queda del contrato.
 * Pensado para gráficos (todas las categorías aparecen aunque estén en 0).
 */
export async function resumen(proyectoId: number) {
  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { montoContrato: true } });
  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');

  const gastos = await prisma.gasto.findMany({
    where: { proyectoId },
    select: { categoria: true, monto: true, fecha: true },
    orderBy: { fecha: 'asc' },
  });

  const montoContrato = toNumber(proyecto.montoContrato);
  const totalPorCategoria = Object.fromEntries(Object.values(CategoriaGasto).map((c) => [c, 0])) as Record<CategoriaGasto, number>;
  const totalPorMes = new Map<string, number>();
  let total = 0;

  for (const g of gastos) {
    const monto = toNumber(g.monto);
    total += monto;
    totalPorCategoria[g.categoria] += monto;
    const mes = claveMes(g.fecha);
    totalPorMes.set(mes, (totalPorMes.get(mes) ?? 0) + monto);
  }
  total = round2(total);

  return {
    montoContrato,
    totalGastado: total,
    saldo: round2(montoContrato - total),
    porcentajeEjecutado: porcentaje(total, montoContrato),
    sobrepresupuesto: total > montoContrato,
    cantidadGastos: gastos.length,
    porCategoria: Object.entries(totalPorCategoria).map(([categoria, monto]) => ({
      categoria,
      monto: round2(monto),
      porcentaje: porcentaje(monto, total),
    })),
    porMes: [...totalPorMes.entries()].map(([mes, monto]) => ({ mes, monto: round2(monto) })),
  };
}
