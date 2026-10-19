import { EstadoCobro, EstadoGarantia, Prisma, type Cobro } from '@prisma/client';
import { ZodError } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { porcentaje, round2, toNumber } from '../../utils/helpers';
import { hoyEnLima } from '../notificaciones/notificaciones.service';
import type {
  ActualizarCartaInput,
  ActualizarCobroInput,
  CrearCartaInput,
  CrearCobroInput,
  ListarCartasQuery,
  ListarCobrosQuery,
  RenovarCartaInput,
} from './cobros.schema';

const DIA_MS = 86_400_000;
const proyectoResumido = { select: { id: true, nombre: true, cliente: { select: { nombre: true } } } } as const;

/** Mismo formato 422 que el middleware validate, para que el formulario lo muestre en el campo */
const invalido = (campo: string, message: string) => new ZodError([{ code: 'custom', path: ['body', campo], message }]);

// ---------- Cobros ----------

type DatosCobro = Pick<Cobro, 'monto' | 'detraccion' | 'penalidad' | 'estado' | 'comprobante' | 'fechaEmision' | 'fechaCobro'>;

/** Coherencia del cobro completo (al crear, o el registro ya combinado con los cambios al editar) */
function validarCobro(c: { monto: number; detraccion: number; penalidad: number; estado: EstadoCobro; comprobante?: string | null; fechaEmision?: Date | null; fechaCobro?: Date | null }) {
  if (round2(c.detraccion + c.penalidad) > c.monto) throw invalido('detraccion', 'La detracción más la penalidad no pueden superar el monto');
  if (c.estado === EstadoCobro.FACTURADO || c.estado === EstadoCobro.COBRADO) {
    if (!c.comprobante) throw invalido('comprobante', 'Indica el comprobante emitido (serie y número)');
    if (!c.fechaEmision) throw invalido('fechaEmision', 'Indica la fecha de emisión del comprobante');
  }
  if (c.estado === EstadoCobro.COBRADO) {
    if (!c.fechaCobro) throw invalido('fechaCobro', 'Indica la fecha en que se recibió el pago');
    if (c.fechaEmision && c.fechaCobro < c.fechaEmision) throw invalido('fechaCobro', 'El pago no puede ser anterior a la emisión del comprobante');
  }
}

/** Montos como número y lo que llega a la cuenta de la empresa (sin detracción ni penalidad) */
function formatear<T extends DatosCobro>(c: T, hoy = hoyEnLima()) {
  const monto = toNumber(c.monto);
  const detraccion = toNumber(c.detraccion);
  const penalidad = toNumber(c.penalidad);
  return {
    ...c,
    monto,
    detraccion,
    penalidad,
    neto: round2(monto - detraccion - penalidad),
    // Facturado y aún sin cobrar: días desde la emisión
    diasPorCobrar: c.estado === EstadoCobro.FACTURADO && c.fechaEmision ? Math.max(0, Math.floor((hoy.getTime() - c.fechaEmision.getTime()) / DIA_MS)) : null,
  };
}

function resumir(cobros: ReturnType<typeof formatear>[], montoContrato: number) {
  const suma = (lista: typeof cobros, campo: 'monto' | 'detraccion' | 'penalidad' | 'neto') => round2(lista.reduce((s, c) => s + c[campo], 0));
  const activos = cobros.filter((c) => c.estado !== EstadoCobro.ANULADO);
  const facturados = activos.filter((c) => c.estado !== EstadoCobro.PROGRAMADO);
  const cobrados = activos.filter((c) => c.estado === EstadoCobro.COBRADO);
  const programado = suma(activos, 'monto');
  const facturado = suma(facturados, 'monto');
  const cobrado = suma(cobrados, 'monto');
  return {
    montoContrato,
    programado,
    facturado,
    cobrado,
    porCobrar: round2(facturado - cobrado), // comprobantes emitidos que aún no se pagan
    porFacturar: round2(Math.max(0, montoContrato - facturado)),
    sinProgramar: round2(montoContrato - programado), // negativo: lo pactado supera el contrato (¿adicionales?)
    netoRecibido: suma(cobrados, 'neto'),
    detracciones: suma(cobrados, 'detraccion'),
    penalidades: suma(cobrados, 'penalidad'),
    porcentajeCobrado: porcentaje(cobrado, montoContrato),
  };
}

export async function listarPorProyecto(proyectoId: number) {
  const proyecto = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { montoContrato: true } });
  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');
  const hoy = hoyEnLima();
  const cobros = (
    await prisma.cobro.findMany({ where: { proyectoId }, orderBy: [{ fechaProgramada: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }] })
  ).map((c) => formatear(c, hoy));
  return { resumen: resumir(cobros, toNumber(proyecto.montoContrato)), cobros };
}

export async function crear(proyectoId: number, data: CrearCobroInput) {
  const datos = { ...data, fechaCobro: data.estado === EstadoCobro.COBRADO ? data.fechaCobro : null };
  validarCobro(datos);
  return formatear(await prisma.cobro.create({ data: { ...datos, proyectoId } }));
}

export async function actualizar(id: number, data: ActualizarCobroInput) {
  const actual = await prisma.cobro.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Cobro no encontrado');
  const estado = data.estado ?? actual.estado;
  const combinado = {
    monto: data.monto ?? toNumber(actual.monto),
    detraccion: data.detraccion ?? toNumber(actual.detraccion),
    penalidad: data.penalidad ?? toNumber(actual.penalidad),
    estado,
    comprobante: data.comprobante === undefined ? actual.comprobante : data.comprobante,
    fechaEmision: data.fechaEmision === undefined ? actual.fechaEmision : data.fechaEmision,
    // La fecha de pago solo tiene sentido si está cobrado: al volver atrás se borra
    fechaCobro: estado !== EstadoCobro.COBRADO ? null : data.fechaCobro === undefined ? actual.fechaCobro : data.fechaCobro,
  };
  validarCobro(combinado);
  return formatear(await prisma.cobro.update({ where: { id }, data: { ...data, fechaCobro: combinado.fechaCobro } }));
}

export async function eliminar(id: number) {
  await prisma.cobro.delete({ where: { id } }); // inexistente -> P2025 -> 404
}

/** Vista de toda la empresa: cobros (por defecto los pendientes) y totales */
export async function listarTodos({ estado, proyectoId }: ListarCobrosQuery) {
  const where: Prisma.CobroWhereInput = {
    ...(proyectoId && { proyectoId }),
    ...(estado === 'PENDIENTES' ? { estado: { in: [EstadoCobro.PROGRAMADO, EstadoCobro.FACTURADO] } } : estado && { estado }),
  };
  const hoy = hoyEnLima();
  const inicioAnio = new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1));
  const [cobros, cobradosAnio, pendientes] = await Promise.all([
    prisma.cobro.findMany({
      where,
      orderBy: [{ fechaProgramada: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      include: { proyecto: proyectoResumido },
    }),
    prisma.cobro.findMany({ where: { estado: EstadoCobro.COBRADO, fechaCobro: { gte: inicioAnio } }, select: { monto: true, detraccion: true, penalidad: true } }),
    prisma.cobro.findMany({ where: { estado: { in: [EstadoCobro.PROGRAMADO, EstadoCobro.FACTURADO] } }, select: { monto: true, estado: true, fechaEmision: true } }),
  ]);
  const facturadoPendiente = pendientes.filter((c) => c.estado === EstadoCobro.FACTURADO);
  return {
    resumen: {
      porCobrar: round2(facturadoPendiente.reduce((s, c) => s + toNumber(c.monto), 0)),
      facturasMas30Dias: facturadoPendiente.filter((c) => c.fechaEmision && hoy.getTime() - c.fechaEmision.getTime() > 30 * DIA_MS).length,
      programadoSinFacturar: round2(pendientes.filter((c) => c.estado === EstadoCobro.PROGRAMADO).reduce((s, c) => s + toNumber(c.monto), 0)),
      cobradoAnio: round2(cobradosAnio.reduce((s, c) => s + toNumber(c.monto), 0)),
      netoRecibidoAnio: round2(cobradosAnio.reduce((s, c) => s + toNumber(c.monto) - toNumber(c.detraccion) - toNumber(c.penalidad), 0)),
      detraccionesAnio: round2(cobradosAnio.reduce((s, c) => s + toNumber(c.detraccion), 0)),
    },
    cobros: cobros.map((c) => formatear(c, hoy)),
  };
}

// ---------- Cartas fianza ----------

function formatearCarta<T extends { monto: Prisma.Decimal; estado: EstadoGarantia; fechaVencimiento: Date }>(c: T, hoy = hoyEnLima()) {
  return {
    ...c,
    monto: toNumber(c.monto),
    // Solo para las vigentes: negativo = ya venció
    diasParaVencer: c.estado === EstadoGarantia.VIGENTE ? Math.round((c.fechaVencimiento.getTime() - hoy.getTime()) / DIA_MS) : null,
  };
}

const incluirCarta = {
  renovadaDe: { select: { id: true, numero: true } },
  renovadaPor: { select: { id: true, numero: true } },
} as const;

export async function listarCartasPorProyecto(proyectoId: number) {
  const hoy = hoyEnLima();
  const cartas = await prisma.cartaFianza.findMany({ where: { proyectoId }, orderBy: [{ fechaVencimiento: 'desc' }, { id: 'desc' }], include: incluirCarta });
  return cartas.map((c) => formatearCarta(c, hoy));
}

export async function listarCartas({ estado, proyectoId }: ListarCartasQuery) {
  const hoy = hoyEnLima();
  const cartas = await prisma.cartaFianza.findMany({
    where: { ...(estado && { estado }), ...(proyectoId && { proyectoId }) },
    orderBy: [{ fechaVencimiento: 'asc' }, { id: 'asc' }],
    include: { ...incluirCarta, proyecto: proyectoResumido },
  });
  return cartas.map((c) => formatearCarta(c, hoy));
}

export async function crearCarta(proyectoId: number, data: CrearCartaInput) {
  return formatearCarta(await prisma.cartaFianza.create({ data: { ...data, proyectoId }, include: incluirCarta }));
}

export async function actualizarCarta(id: number, data: ActualizarCartaInput) {
  const actual = await prisma.cartaFianza.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Carta fianza no encontrada');
  if (actual.estado === EstadoGarantia.RENOVADA && data.estado) {
    throw AppError.conflict('Esta carta ya fue reemplazada por su renovación; cambia el estado de la carta nueva');
  }
  const emision = data.fechaEmision ?? actual.fechaEmision;
  const vencimiento = data.fechaVencimiento ?? actual.fechaVencimiento;
  if (vencimiento <= emision) throw invalido('fechaVencimiento', 'El vencimiento debe ser posterior a la emisión');
  return formatearCarta(await prisma.cartaFianza.update({ where: { id }, data, include: incluirCarta }));
}

/** La carta vigente pasa a RENOVADA y se crea la nueva, enlazada a la anterior */
export async function renovarCarta(id: number, data: RenovarCartaInput) {
  const actual = await prisma.cartaFianza.findUnique({ where: { id } });
  if (!actual) throw AppError.notFound('Carta fianza no encontrada');
  if (actual.estado !== EstadoGarantia.VIGENTE) throw AppError.conflict('Solo se renueva una carta vigente');
  const nueva = await prisma.$transaction(async (tx) => {
    // Atómico: si dos personas renuevan a la vez, solo una lo logra
    const { count } = await tx.cartaFianza.updateMany({ where: { id, estado: EstadoGarantia.VIGENTE }, data: { estado: EstadoGarantia.RENOVADA } });
    if (count === 0) throw AppError.conflict('Solo se renueva una carta vigente');
    return tx.cartaFianza.create({
      data: {
        proyectoId: actual.proyectoId,
        tipo: actual.tipo,
        numero: data.numero,
        entidadFinanciera: data.entidadFinanciera ?? actual.entidadFinanciera,
        monto: data.monto ?? actual.monto,
        fechaEmision: data.fechaEmision,
        fechaVencimiento: data.fechaVencimiento,
        observacion: data.observacion,
        renovadaDeId: id,
      },
      include: incluirCarta,
    });
  });
  return formatearCarta(nueva);
}

/** Si era una renovación (registrada por error), la carta anterior vuelve a quedar vigente */
export async function eliminarCarta(id: number) {
  await prisma.$transaction(async (tx) => {
    const carta = await tx.cartaFianza.delete({ where: { id } }); // inexistente -> P2025 -> 404
    if (carta.renovadaDeId) {
      await tx.cartaFianza.updateMany({ where: { id: carta.renovadaDeId, estado: EstadoGarantia.RENOVADA }, data: { estado: EstadoGarantia.VIGENTE } });
    }
  });
}
