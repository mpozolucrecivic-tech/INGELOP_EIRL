import { CategoriaGasto, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { claveMes, filtroFechas, porcentaje, round2, toNumber } from '../../utils/helpers';
import {
  CATEGORIAS_EMPRESA,
  CATEGORIAS_PROYECTO,
  categoriaValida,
  type ActualizarGastoInput,
  type CrearGastoInput,
  type FilaImportacion,
  type ImportarGastosInput,
  type ListarGastosQuery,
} from './gastos.schema';

const mensajeCategoria = (proyectoId: number | null) =>
  proyectoId ? 'Esa categoría es de gastos de la empresa, no de un proyecto' : 'Esa categoría es de gastos de proyecto, no de la empresa';

function filtroLista(filtros: ListarGastosQuery): Prisma.GastoWhereInput {
  return {
    ...(filtros.categoria && { categoria: filtros.categoria }),
    fecha: filtroFechas(filtros.desde, filtros.hasta),
  };
}

export function listarPorProyecto(proyectoId: number, filtros: ListarGastosQuery) {
  return prisma.gasto.findMany({ where: { proyectoId, ...filtroLista(filtros) }, orderBy: { fecha: 'desc' } });
}

/** Gastos de la empresa: los que no pertenecen a ningún proyecto */
export function listarEmpresa(filtros: ListarGastosQuery) {
  return prisma.gasto.findMany({ where: { proyectoId: null, ...filtroLista(filtros) }, orderBy: { fecha: 'desc' } });
}

/** proyectoId null = gasto de la empresa */
export function crear(proyectoId: number | null, data: CrearGastoInput) {
  if (!categoriaValida(data.categoria, proyectoId)) throw AppError.badRequest(mensajeCategoria(proyectoId));
  return prisma.gasto.create({ data: { ...data, proyectoId } });
}

export async function actualizar(id: number, data: ActualizarGastoInput) {
  if (data.categoria) {
    const gasto = await prisma.gasto.findUnique({ where: { id }, select: { proyectoId: true } });
    if (!gasto) throw AppError.notFound('Gasto no encontrado');
    if (!categoriaValida(data.categoria, gasto.proyectoId)) throw AppError.badRequest(mensajeCategoria(gasto.proyectoId));
  }
  return prisma.gasto.update({ where: { id }, data });
}

export async function eliminar(id: number) {
  await prisma.gasto.delete({ where: { id } });
}

type FilaGasto = { categoria: CategoriaGasto; monto: Prisma.Decimal; fecha: Date };

/** Totales por categoría (todas las categorías del grupo, aunque estén en 0) y por mes */
function agrupar(gastos: FilaGasto[], categorias: CategoriaGasto[]) {
  const totalPorCategoria = new Map<CategoriaGasto, number>(categorias.map((c) => [c, 0]));
  const totalPorMes = new Map<string, number>();
  let total = 0;
  for (const g of gastos) {
    const monto = toNumber(g.monto);
    total += monto;
    totalPorCategoria.set(g.categoria, (totalPorCategoria.get(g.categoria) ?? 0) + monto);
    const mes = claveMes(g.fecha);
    totalPorMes.set(mes, (totalPorMes.get(mes) ?? 0) + monto);
  }
  total = round2(total);
  return {
    total,
    porCategoria: [...totalPorCategoria.entries()].map(([categoria, monto]) => ({
      categoria,
      monto: round2(monto),
      porcentaje: porcentaje(monto, total),
    })),
    porMes: [...totalPorMes.entries()].map(([mes, monto]) => ({ mes, monto: round2(monto) })),
  };
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
  const { total, porCategoria, porMes } = agrupar(gastos, CATEGORIAS_PROYECTO);

  return {
    montoContrato,
    totalGastado: total,
    saldo: round2(montoContrato - total),
    porcentajeEjecutado: porcentaje(total, montoContrato),
    sobrepresupuesto: total > montoContrato,
    cantidadGastos: gastos.length,
    porCategoria,
    porMes,
  };
}

/** Resumen de los gastos de la empresa en un rango de fechas (por defecto, todos) */
export async function resumenEmpresa(filtros: ListarGastosQuery) {
  const gastos = await prisma.gasto.findMany({
    where: { proyectoId: null, ...filtroLista(filtros) },
    select: { categoria: true, monto: true, fecha: true },
    orderBy: { fecha: 'asc' },
  });
  return { cantidadGastos: gastos.length, ...agrupar(gastos, CATEGORIAS_EMPRESA) };
}

// ---------- Importación desde Excel ----------

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Mismo destino, día, monto y descripción = posible duplicado */
const claveDuplicado = (g: { proyectoId: number | null; fecha: Date; monto: number; descripcion: string }) =>
  `${g.proyectoId ?? 'empresa'}|${g.fecha.toISOString().slice(0, 10)}|${g.monto.toFixed(2)}|${normalizar(g.descripcion)}`;

/**
 * Marca las filas que parecen repetidas antes de importar:
 * EXISTE = ya hay un gasto igual en el sistema; ARCHIVO = se repite dentro del mismo archivo.
 */
export async function verificarImportacion(filas: FilaImportacion[]) {
  const fechas = filas.map((f) => f.fecha.getTime());
  const desde = new Date(Math.min(...fechas));
  const hasta = new Date(Math.max(...fechas) + 24 * 3600 * 1000);
  const proyectos = [...new Set(filas.map((f) => f.proyectoId).filter((p): p is number => p !== null))];
  const conEmpresa = filas.some((f) => f.proyectoId === null);

  const existentes = await prisma.gasto.findMany({
    where: {
      fecha: { gte: desde, lt: hasta },
      OR: [...(proyectos.length ? [{ proyectoId: { in: proyectos } }] : []), ...(conEmpresa ? [{ proyectoId: null }] : [])],
    },
    select: { id: true, proyectoId: true, fecha: true, monto: true, descripcion: true },
  });
  const enSistema = new Map(existentes.map((g) => [claveDuplicado({ ...g, monto: toNumber(g.monto) }), g.id]));

  const vistas = new Set<string>();
  return filas.map((f) => {
    const clave = claveDuplicado(f);
    const gastoId = enSistema.get(clave);
    const repetida = vistas.has(clave);
    vistas.add(clave);
    return { fila: f.fila, duplicado: gastoId ? 'EXISTE' : repetida ? 'ARCHIVO' : null, gastoId: gastoId ?? null };
  });
}

/** Guarda todas las filas o ninguna. Cada error indica la fila del Excel. */
export async function importar(input: ImportarGastosInput, usuarioId: number) {
  const { origenProyectoId, filas } = input;
  const errores: { fila: number; mensaje: string }[] = [];

  if (origenProyectoId !== null) {
    const ajenas = filas.filter((f) => f.proyectoId !== origenProyectoId);
    for (const f of ajenas) errores.push({ fila: f.fila, mensaje: 'Desde un proyecto solo se importan gastos de ese proyecto' });
  }

  const ids = [...new Set(filas.map((f) => f.proyectoId).filter((p): p is number => p !== null))];
  const existen = new Set((await prisma.proyecto.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id));
  for (const f of filas) {
    if (f.proyectoId !== null && !existen.has(f.proyectoId)) errores.push({ fila: f.fila, mensaje: 'El proyecto no existe' });
    else if (!categoriaValida(f.categoria, f.proyectoId)) errores.push({ fila: f.fila, mensaje: mensajeCategoria(f.proyectoId) });
  }
  if (errores.length) throw AppError.badRequest('Hay filas que no se pueden importar', errores.slice(0, 50));

  const total = round2(filas.reduce((s, f) => s + f.monto, 0));
  return prisma.$transaction(async (tx) => {
    const importacion = await tx.importacionGasto.create({
      data: { proyectoId: origenProyectoId, usuarioId, nombreArchivo: input.nombreArchivo, cantidad: filas.length, total },
    });
    await tx.gasto.createMany({
      data: filas.map(({ fila: _fila, ...g }) => ({ ...g, importacionId: importacion.id })),
    });
    return { ...importacion, total: toNumber(importacion.total) };
  });
}

/** Historial de importaciones: de un proyecto, o las hechas desde "Gastos de la empresa" */
export async function listarImportaciones(proyectoId?: number) {
  const importaciones = await prisma.importacionGasto.findMany({
    where: { proyectoId: proyectoId ?? null },
    include: { usuario: { select: { id: true, nombre: true } }, _count: { select: { gastos: true } } },
    orderBy: { creadoEn: 'desc' },
    take: 50,
  });
  return importaciones.map(({ _count, ...i }) => ({ ...i, total: toNumber(i.total), gastosVigentes: _count.gastos }));
}

/** Borra los gastos que trajo una importación (los editados también) y la marca como deshecha */
export async function deshacerImportacion(id: number) {
  const importacion = await prisma.importacionGasto.findUnique({ where: { id }, select: { id: true, proyectoId: true, deshechaEn: true } });
  if (!importacion) throw AppError.notFound('Importación no encontrada');
  if (importacion.deshechaEn) throw AppError.conflict('Esta importación ya fue deshecha');

  return prisma.$transaction(async (tx) => {
    // Condicional para que dos clics simultáneos no la deshagan dos veces
    const marcada = await tx.importacionGasto.updateMany({ where: { id, deshechaEn: null }, data: { deshechaEn: new Date() } });
    if (!marcada.count) throw AppError.conflict('Esta importación ya fue deshecha');
    const { count } = await tx.gasto.deleteMany({ where: { importacionId: id } });
    return { gastosEliminados: count, proyectoId: importacion.proyectoId };
  });
}
