import { CategoriaGasto, Especialidad, EstadoProyecto, EstadoRevision, RubroObra, TipoEvidencia, TipoServicio } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';
import { claveMes, porcentaje, round2, toNumber } from '../../utils/helpers';
import { listarPorProyecto as listarEntregables } from '../entregables/entregables.service';
import { resumen as resumenGastos } from '../gastos/gastos.service';
import { resumenHoras } from '../personal/personal.service';
import { listarPorProyecto as listarPresupuestos } from '../presupuestos/presupuestos.service';
import { avancePromedio, conteoPorEstado } from '../sprints/sprints.service';

const DIA_MS = 24 * 60 * 60 * 1000;

function indicadoresTiempo(inicio: Date, fin: Date, hoy = new Date()) {
  const diasTotales = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / DIA_MS));
  const diasTranscurridos = Math.min(diasTotales, Math.max(0, Math.round((hoy.getTime() - inicio.getTime()) / DIA_MS)));
  return {
    diasTotales,
    diasTranscurridos,
    diasRestantes: diasTotales - diasTranscurridos,
    porcentajeTiempo: porcentaje(diasTranscurridos, diasTotales),
    vencido: hoy > fin,
  };
}

const ceros = <K extends string>(claves: K[]) => Object.fromEntries(claves.map((k) => [k, 0])) as Record<K, number>;

/** KPIs de un proyecto (el acceso ya fue verificado por requireProjectAccess) */
export async function dashboardProyecto(proyectoId: number) {
  const proyecto = await prisma.proyecto.findUnique({
    where: { id: proyectoId },
    include: { responsable: { select: { id: true, nombre: true } }, cliente: { select: { id: true, nombre: true } } },
  });
  if (!proyecto) throw AppError.notFound('Proyecto no encontrado');

  const hoy = new Date();
  const [actividades, sprints, planos, entregables, presupuestos, finanzas, horas, profesionales, evidenciasPorTipo, ultimasEvidencias] =
    await Promise.all([
      prisma.actividad.findMany({ where: { sprint: { proyectoId } }, select: { estado: true, avance: true } }),
      prisma.sprint.findMany({
        where: { proyectoId },
        orderBy: { numero: 'asc' },
        select: { id: true, numero: true, objetivo: true, fechaInicio: true, fechaFin: true },
      }),
      prisma.plano.findMany({ where: { proyectoId }, select: { especialidad: true, estado: true } }),
      listarEntregables(proyectoId),
      listarPresupuestos(proyectoId),
      resumenGastos(proyectoId),
      resumenHoras(proyectoId),
      prisma.asignacion.count({ where: { proyectoId, OR: [{ fechaFin: null }, { fechaFin: { gte: hoy } }] } }),
      prisma.evidencia.groupBy({ by: ['tipo'], where: { proyectoId }, _count: { _all: true } }),
      prisma.evidencia.findMany({
        where: { proyectoId },
        orderBy: { fecha: 'desc' },
        take: 5,
        select: { id: true, tipo: true, titulo: true, fecha: true, usuario: { select: { id: true, nombre: true } } },
      }),
    ]);

  // Planos: por estado y por especialidad
  const planosPorEstado = ceros(Object.values(EstadoRevision));
  const especialidades = new Map<Especialidad, { total: number; aprobados: number }>();
  for (const p of planos) {
    planosPorEstado[p.estado]++;
    const e = especialidades.get(p.especialidad) ?? { total: 0, aprobados: 0 };
    e.total++;
    if (p.estado === EstadoRevision.APROBADO) e.aprobados++;
    especialidades.set(p.especialidad, e);
  }

  // Entregables
  const entregablesAprobados = entregables.filter((e) => e.estado === EstadoRevision.APROBADO).length;
  const proximos = entregables
    .filter((e) => e.estado !== EstadoRevision.APROBADO && e.fechaLimite)
    .sort((a, b) => a.fechaLimite!.getTime() - b.fechaLimite!.getTime())
    .slice(0, 5)
    .map(({ id, nombre, estado, fechaLimite, vencido, responsable }) => ({ id, nombre, estado, fechaLimite, vencido, responsable }));

  const conteoEvidencias = ceros(Object.values(TipoEvidencia));
  for (const g of evidenciasPorTipo) conteoEvidencias[g.tipo] = g._count._all;

  return {
    proyecto: {
      id: proyecto.id,
      nombre: proyecto.nombre,
      cliente: proyecto.cliente,
      tipoServicio: proyecto.tipoServicio,
      rubro: proyecto.rubro,
      ubicacion: proyecto.ubicacion,
      estado: proyecto.estado,
      fechaInicio: proyecto.fechaInicio,
      fechaFin: proyecto.fechaFin,
      responsable: proyecto.responsable,
    },
    tiempo: indicadoresTiempo(proyecto.fechaInicio, proyecto.fechaFin, hoy),
    avance: {
      avanceGeneral: avancePromedio(actividades),
      totalActividades: actividades.length,
      actividadesPorEstado: conteoPorEstado(actividades),
      totalSprints: sprints.length,
      sprintVigente: sprints.find((s) => s.fechaInicio <= hoy && hoy <= s.fechaFin) ?? null,
    },
    planos: {
      total: planos.length,
      porEstado: planosPorEstado,
      porcentajeAprobados: porcentaje(planosPorEstado.APROBADO, planos.length),
      porEspecialidad: [...especialidades.entries()].map(([especialidad, v]) => ({ especialidad, ...v })),
    },
    entregables: {
      total: entregables.length,
      aprobados: entregablesAprobados,
      porcentaje: porcentaje(entregablesAprobados, entregables.length),
      vencidos: entregables.filter((e) => e.vencido).length,
      proximos,
    },
    presupuestos: presupuestos.map((p) => ({ id: p.id, nombre: p.nombre, version: p.version, estado: p.estado, total: p.totales.total })),
    finanzas,
    equipo: {
      profesionalesAsignados: profesionales,
      totalHoras: horas.totalHoras,
      costoHoras: horas.costoTotal,
    },
    evidencias: {
      total: Object.values(conteoEvidencias).reduce((s, n) => s + n, 0),
      porTipo: conteoEvidencias,
      ultimas: ultimasEvidencias,
    },
  };
}

/** KPIs globales de la empresa (solo ADMIN) */
export async function dashboardGeneral(meses: number) {
  const hoy = new Date();
  const hoyFecha = new Date(hoy.toISOString().slice(0, 10));
  const inicioVentana = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - (meses - 1), 1));
  const inicioMes = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));

  const [
    proyectos,
    gastosPorProyecto,
    gastosPorCategoria,
    gastosVentana,
    actividades,
    planosPorRevisar,
    planosPorProyecto,
    entregables,
    entregablesVencidos,
    horasMes,
    clientesActivos,
    profesionalesActivos,
    usuariosActivos,
  ] = await Promise.all([
    prisma.proyecto.findMany({
      select: {
        id: true,
        nombre: true,
        cliente: { select: { id: true, nombre: true } },
        tipoServicio: true,
        rubro: true,
        estado: true,
        montoContrato: true,
        fechaInicio: true,
        fechaFin: true,
      },
      orderBy: { fechaInicio: 'desc' },
    }),
    prisma.gasto.groupBy({ by: ['proyectoId'], _sum: { monto: true } }),
    prisma.gasto.groupBy({ by: ['categoria'], _sum: { monto: true } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicioVentana } }, select: { fecha: true, monto: true } }),
    prisma.actividad.findMany({ select: { estado: true, avance: true, sprint: { select: { proyectoId: true } } } }),
    prisma.plano.findMany({
      where: { estado: EstadoRevision.EN_REVISION },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        especialidad: true,
        actualizadoEn: true,
        proyecto: { select: { id: true, nombre: true } },
      },
      orderBy: { actualizadoEn: 'asc' },
    }),
    prisma.plano.groupBy({ by: ['proyectoId', 'estado'], _count: { _all: true } }),
    prisma.entregable.groupBy({ by: ['proyectoId', 'estado'], _count: { _all: true } }),
    prisma.entregable.findMany({
      where: { estado: { not: EstadoRevision.APROBADO }, fechaLimite: { lt: hoyFecha } },
      select: { id: true, nombre: true, fechaLimite: true, proyecto: { select: { id: true, nombre: true } } },
      orderBy: { fechaLimite: 'asc' },
    }),
    prisma.registroHoras.aggregate({ where: { fecha: { gte: inicioMes } }, _sum: { horas: true } }),
    prisma.cliente.count({ where: { activo: true } }),
    prisma.trabajador.count({ where: { activo: true } }),
    prisma.usuario.count({ where: { activo: true } }),
  ]);

  const gastadoPorProyecto = new Map(gastosPorProyecto.map((g) => [g.proyectoId, toNumber(g._sum.monto)]));
  const montoTotal = round2(proyectos.reduce((s, p) => s + toNumber(p.montoContrato), 0));
  const gastoTotal = round2([...gastadoPorProyecto.values()].reduce((s, n) => s + n, 0));

  // Serie mensual continua (incluye meses sin gasto) para gráficos
  const porMes = new Map<string, number>();
  for (let i = 0; i < meses; i++) {
    porMes.set(claveMes(new Date(Date.UTC(inicioVentana.getUTCFullYear(), inicioVentana.getUTCMonth() + i, 1))), 0);
  }
  for (const g of gastosVentana) {
    const mes = claveMes(g.fecha);
    if (porMes.has(mes)) porMes.set(mes, porMes.get(mes)! + toNumber(g.monto));
  }

  const porEstado = ceros(Object.values(EstadoProyecto));
  const porTipoServicio = ceros(Object.values(TipoServicio));
  const porRubro = ceros(Object.values(RubroObra));
  for (const p of proyectos) {
    porEstado[p.estado]++;
    porTipoServicio[p.tipoServicio]++;
    porRubro[p.rubro]++;
  }

  const categorias = new Map(gastosPorCategoria.map((g) => [g.categoria, toNumber(g._sum.monto)]));
  const contar = (filas: { proyectoId: number; estado: EstadoRevision; _count: { _all: number } }[], proyectoId: number, estado?: EstadoRevision) =>
    filas.filter((f) => f.proyectoId === proyectoId && (!estado || f.estado === estado)).reduce((s, f) => s + f._count._all, 0);

  return {
    proyectos: { total: proyectos.length, porEstado, porTipoServicio, porRubro },
    finanzas: {
      montoContratado: montoTotal,
      gastoTotal,
      margen: round2(montoTotal - gastoTotal),
      porcentajeEjecutado: porcentaje(gastoTotal, montoTotal),
      porCategoria: Object.values(CategoriaGasto).map((c) => ({
        categoria: c,
        monto: round2(categorias.get(c) ?? 0),
        porcentaje: porcentaje(categorias.get(c) ?? 0, gastoTotal),
      })),
      porMes: [...porMes.entries()].map(([mes, monto]) => ({ mes, monto: round2(monto) })),
    },
    planosPorRevisar,
    entregablesVencidos,
    horasMes: toNumber(horasMes._sum.horas),
    clientesActivos,
    profesionalesActivos,
    usuariosActivos,
    resumenProyectos: proyectos.map((p) => {
      const monto = toNumber(p.montoContrato);
      const gastado = round2(gastadoPorProyecto.get(p.id) ?? 0);
      const totalEntregables = contar(entregables, p.id);
      return {
        ...p,
        gastado,
        porcentajeEjecutado: porcentaje(gastado, monto),
        sobrepresupuesto: gastado > monto,
        avance: avancePromedio(actividades.filter((a) => a.sprint.proyectoId === p.id)),
        planos: { total: contar(planosPorProyecto, p.id), aprobados: contar(planosPorProyecto, p.id, EstadoRevision.APROBADO) },
        entregables: { total: totalEntregables, aprobados: contar(entregables, p.id, EstadoRevision.APROBADO) },
        planosPorRevisar: contar(planosPorProyecto, p.id, EstadoRevision.EN_REVISION),
        tiempo: indicadoresTiempo(p.fechaInicio, p.fechaFin, hoy),
      };
    }),
  };
}
