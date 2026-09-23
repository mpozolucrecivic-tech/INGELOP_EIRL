import { EstadoRevision, Prisma, Rol } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { assertProjectAccess } from '../../utils/access';
import { round2, toNumber } from '../../utils/helpers';
import type { UsuarioAutenticado } from '../../types/express';
import type { ActualizarPresupuestoInput, CrearPresupuestoInput, PartidaInput } from './presupuestos.schema';

type PresupuestoConPartidas = Prisma.PresupuestoGetPayload<{ include: { partidas: true } }>;

/**
 * Calcula parciales y totales:
 * parcial = metrado × P.U. · título = suma de sus partidas hijas (ítem con su prefijo)
 * CD = Σ parciales · GG y utilidad sobre CD · subtotal = CD + GG + U · IGV sobre subtotal
 */
export function calcular(p: PresupuestoConPartidas) {
  const partidas = [...p.partidas]
    .sort((a, b) => a.orden - b.orden)
    .map((x) => ({
      id: x.id,
      orden: x.orden,
      item: x.item,
      descripcion: x.descripcion,
      esTitulo: x.esTitulo,
      unidad: x.unidad,
      metrado: x.metrado == null ? null : toNumber(x.metrado),
      precioUnitario: x.precioUnitario == null ? null : toNumber(x.precioUnitario),
      parcial: x.esTitulo ? 0 : round2(toNumber(x.metrado) * toNumber(x.precioUnitario)),
    }));

  for (const t of partidas.filter((x) => x.esTitulo)) {
    t.parcial = round2(
      partidas.filter((x) => !x.esTitulo && x.item.startsWith(`${t.item}.`)).reduce((s, x) => s + x.parcial, 0),
    );
  }

  const gg = toNumber(p.gastosGeneralesPct);
  const ut = toNumber(p.utilidadPct);
  const igv = toNumber(p.igvPct);
  const costoDirecto = round2(partidas.filter((x) => !x.esTitulo).reduce((s, x) => s + x.parcial, 0));
  const gastosGenerales = round2((costoDirecto * gg) / 100);
  const utilidad = round2((costoDirecto * ut) / 100);
  const subtotal = round2(costoDirecto + gastosGenerales + utilidad);
  const montoIgv = round2((subtotal * igv) / 100);

  const { partidas: _omit, ...cabecera } = p;
  void _omit;
  return {
    ...cabecera,
    partidas,
    totales: {
      costoDirecto,
      gastosGenerales,
      utilidad,
      subtotal,
      igv: montoIgv,
      total: round2(subtotal + montoIgv),
      cantidadPartidas: partidas.filter((x) => !x.esTitulo).length,
    },
  };
}

async function obtenerConAcceso(usuario: UsuarioAutenticado, id: number) {
  const presupuesto = await prisma.presupuesto.findUnique({ where: { id }, include: { partidas: true } });
  if (!presupuesto) throw AppError.notFound('Presupuesto no encontrado');
  await assertProjectAccess(usuario, presupuesto.proyectoId);
  return presupuesto;
}

function assertEditable(p: { estado: EstadoRevision }) {
  if (p.estado === EstadoRevision.APROBADO) {
    throw AppError.conflict('El presupuesto está aprobado y no se puede modificar; crea una nueva versión');
  }
}

export async function listarPorProyecto(proyectoId: number) {
  const presupuestos = await prisma.presupuesto.findMany({
    where: { proyectoId },
    include: { partidas: true },
    orderBy: [{ nombre: 'asc' }, { version: 'desc' }],
  });
  // En el listado no se envían las partidas, solo los totales
  return presupuestos.map((p) => {
    const { partidas: _p, ...resto } = calcular(p);
    void _p;
    return resto;
  });
}

export async function obtener(usuario: UsuarioAutenticado, id: number) {
  return calcular(await obtenerConAcceso(usuario, id));
}

export async function crear(proyectoId: number, data: CrearPresupuestoInput) {
  const creado = await prisma.presupuesto.create({ data: { ...data, proyectoId }, include: { partidas: true } });
  return calcular(creado);
}

/** USUARIO solo puede pasar entre BORRADOR y EN_REVISION; aprobar u observar es del ADMIN */
export async function actualizar(usuario: UsuarioAutenticado, id: number, data: ActualizarPresupuestoInput) {
  const actual = await obtenerConAcceso(usuario, id);
  const soloEstado = Object.keys(data).length === 1 && data.estado !== undefined;
  if (usuario.rol !== Rol.ADMIN) {
    assertEditable(actual);
    const permitidos: EstadoRevision[] = [EstadoRevision.BORRADOR, EstadoRevision.EN_REVISION];
    if (data.estado && !permitidos.includes(data.estado)) {
      throw AppError.forbidden('Solo un administrador puede aprobar u observar un presupuesto');
    }
  } else if (!soloEstado) {
    assertEditable(actual);
  }
  const actualizado = await prisma.presupuesto.update({ where: { id }, data, include: { partidas: true } });
  return calcular(actualizado);
}

/** Reemplaza todas las partidas en una transacción (lo que envía la hoja editable) */
export async function guardarPartidas(usuario: UsuarioAutenticado, id: number, partidas: PartidaInput[]) {
  const actual = await obtenerConAcceso(usuario, id);
  assertEditable(actual);

  const items = new Set<string>();
  for (const p of partidas) {
    if (items.has(p.item)) throw AppError.badRequest(`Ítem repetido: ${p.item}`);
    items.add(p.item);
  }

  await prisma.$transaction([
    prisma.partidaPresupuesto.deleteMany({ where: { presupuestoId: id } }),
    prisma.partidaPresupuesto.createMany({
      data: partidas.map((p, orden) => ({
        presupuestoId: id,
        orden,
        item: p.item,
        descripcion: p.descripcion,
        esTitulo: p.esTitulo,
        unidad: p.esTitulo ? null : p.unidad,
        metrado: p.esTitulo ? null : p.metrado,
        precioUnitario: p.esTitulo ? null : p.precioUnitario,
      })),
    }),
    // actualiza "actualizadoEn"
    prisma.presupuesto.update({ where: { id }, data: { estado: actual.estado } }),
  ]);

  return obtener(usuario, id);
}

/** Crea una nueva versión (copia en BORRADOR) para revisar un presupuesto ya enviado o aprobado */
export async function duplicar(usuario: UsuarioAutenticado, id: number) {
  const origen = await obtenerConAcceso(usuario, id);
  const ultima = await prisma.presupuesto.aggregate({
    where: { proyectoId: origen.proyectoId, nombre: origen.nombre },
    _max: { version: true },
  });
  const copia = await prisma.presupuesto.create({
    data: {
      proyectoId: origen.proyectoId,
      nombre: origen.nombre,
      version: (ultima._max.version ?? origen.version) + 1,
      gastosGeneralesPct: origen.gastosGeneralesPct,
      utilidadPct: origen.utilidadPct,
      igvPct: origen.igvPct,
      observaciones: origen.observaciones,
      partidas: {
        create: origen.partidas.map(({ orden, item, descripcion, esTitulo, unidad, metrado, precioUnitario }) => ({
          orden,
          item,
          descripcion,
          esTitulo,
          unidad,
          metrado,
          precioUnitario,
        })),
      },
    },
    include: { partidas: true },
  });
  return calcular(copia);
}

export async function eliminar(id: number) {
  await prisma.presupuesto.delete({ where: { id } });
}
