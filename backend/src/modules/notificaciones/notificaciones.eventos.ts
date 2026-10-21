import { EstadoEtapa, EstadoRevision, type TipoEtapa } from '../../generated/prisma/client';
import { prisma } from '../../config/prisma';
import { revisionLetra } from '../planos/planos.service';
import { enSegundoPlano, equipoProyecto, jefaturas, notificar } from './notificaciones.service';

/**
 * Quién recibe cada aviso (nunca quien hizo la acción):
 * - Algo pasa a revisión (plano, presupuesto, etapa)  -> jefatura
 * - La jefatura aprueba u observa un plano           -> su responsable y quien subió la última revisión
 * - La jefatura aprueba u observa presupuesto o etapa -> responsable del proyecto y usuarios con acceso
 * - Dan acceso a un proyecto                          -> esa persona
 * - Entregables por vencer o vencidos                 -> ver notificaciones.service (recordatorios)
 * Todo corre en segundo plano: un fallo aquí no afecta la acción original.
 */

const ETAPA: Record<TipoEtapa, string> = {
  PREINVERSION: 'Preinversión',
  EXPEDIENTE_TECNICO: 'Expediente técnico',
  SUPERVISION: 'Supervisión',
  LIQUIDACION: 'Liquidación',
};

const recortar = (s: string | null | undefined, max = 160) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s ?? null);

export function planoEnRevision(planoId: number, actorId: number) {
  enSegundoPlano(async () => {
    const p = await prisma.plano.findUnique({
      where: { id: planoId },
      select: {
        codigo: true,
        estado: true,
        proyecto: { select: { id: true, nombre: true } },
        versiones: { orderBy: { revision: 'desc' }, take: 1, select: { revision: true, usuario: { select: { nombre: true } } } },
      },
    });
    const v = p?.versiones[0];
    if (!p || !v || p.estado !== EstadoRevision.EN_REVISION) return;
    await notificar(
      await jefaturas(),
      {
        tipo: 'PLANO_EN_REVISION',
        titulo: `Plano ${p.codigo} espera revisión`,
        mensaje: `${p.proyecto.nombre} · Rev. ${revisionLetra(v.revision)} subida por ${v.usuario.nombre}`,
        enlace: `/proyectos/${p.proyecto.id}/expediente/planos`,
      },
      actorId,
    );
  }, `plano ${planoId} en revisión`);
}

export function planoRevisado(planoId: number, actorId: number) {
  enSegundoPlano(async () => {
    const p = await prisma.plano.findUnique({
      where: { id: planoId },
      select: {
        codigo: true,
        estado: true,
        observacion: true,
        responsableId: true,
        proyecto: { select: { id: true, nombre: true } },
        versiones: { orderBy: { revision: 'desc' }, take: 1, select: { usuarioId: true } },
      },
    });
    if (!p || (p.estado !== EstadoRevision.APROBADO && p.estado !== EstadoRevision.OBSERVADO)) return;
    const aprobado = p.estado === EstadoRevision.APROBADO;
    await notificar(
      [p.responsableId, p.versiones[0]?.usuarioId],
      {
        tipo: aprobado ? 'PLANO_APROBADO' : 'PLANO_OBSERVADO',
        titulo: aprobado ? `Plano ${p.codigo} aprobado` : `Plano ${p.codigo} observado`,
        mensaje: aprobado ? p.proyecto.nombre : `${p.proyecto.nombre} · ${recortar(p.observacion) ?? 'Revisa la observación'}`,
        enlace: `/proyectos/${p.proyecto.id}/expediente/planos`,
      },
      actorId,
    );
  }, `plano ${planoId} revisado`);
}

export function presupuestoCambioEstado(presupuestoId: number, actorId: number) {
  enSegundoPlano(async () => {
    const p = await prisma.presupuesto.findUnique({
      where: { id: presupuestoId },
      select: { nombre: true, version: true, estado: true, observaciones: true, proyecto: { select: { id: true, nombre: true } } },
    });
    if (!p) return;
    const enlace = `/proyectos/${p.proyecto.id}/expediente/presupuestos`;
    const nombre = `${p.nombre} (v${p.version})`;
    if (p.estado === EstadoRevision.EN_REVISION) {
      await notificar(await jefaturas(), { tipo: 'PRESUPUESTO_EN_REVISION', titulo: `Presupuesto espera revisión: ${nombre}`, mensaje: p.proyecto.nombre, enlace }, actorId);
    } else if (p.estado === EstadoRevision.APROBADO || p.estado === EstadoRevision.OBSERVADO) {
      const aprobado = p.estado === EstadoRevision.APROBADO;
      await notificar(
        await equipoProyecto(p.proyecto.id),
        {
          tipo: aprobado ? 'PRESUPUESTO_APROBADO' : 'PRESUPUESTO_OBSERVADO',
          titulo: `Presupuesto ${aprobado ? 'aprobado' : 'observado'}: ${nombre}`,
          mensaje: aprobado ? p.proyecto.nombre : `${p.proyecto.nombre}${p.observaciones ? ` · ${recortar(p.observaciones)}` : ''}`,
          enlace,
        },
        actorId,
      );
    }
  }, `presupuesto ${presupuestoId}`);
}

export function etapaCambioEstado(etapaId: number, actorId: number) {
  enSegundoPlano(async () => {
    const e = await prisma.etapa.findUnique({
      where: { id: etapaId },
      select: { tipo: true, estado: true, observacion: true, proyecto: { select: { id: true, nombre: true } } },
    });
    if (!e) return;
    const enlace = `/proyectos/${e.proyecto.id}/expediente/etapas`;
    const etapa = ETAPA[e.tipo];
    if (e.estado === EstadoEtapa.EN_REVISION) {
      await notificar(await jefaturas(), { tipo: 'ETAPA_EN_REVISION', titulo: `Etapa en revisión: ${etapa}`, mensaje: e.proyecto.nombre, enlace }, actorId);
    } else if (e.estado === EstadoEtapa.APROBADO || e.estado === EstadoEtapa.OBSERVADO) {
      const aprobado = e.estado === EstadoEtapa.APROBADO;
      await notificar(
        await equipoProyecto(e.proyecto.id),
        {
          tipo: aprobado ? 'ETAPA_APROBADA' : 'ETAPA_OBSERVADA',
          titulo: `Etapa ${aprobado ? 'aprobada' : 'observada'}: ${etapa}`,
          mensaje: aprobado ? e.proyecto.nombre : `${e.proyecto.nombre} · ${recortar(e.observacion) ?? 'Revisa la observación'}`,
          enlace,
        },
        actorId,
      );
    }
  }, `etapa ${etapaId}`);
}

export function accesoAProyecto(proyectoId: number, usuarioId: number, actorId: number) {
  enSegundoPlano(async () => {
    const p = await prisma.proyecto.findUnique({ where: { id: proyectoId }, select: { nombre: true } });
    if (!p) return;
    await notificar([usuarioId], { tipo: 'ACCESO_PROYECTO', titulo: 'Te dieron acceso a un proyecto', mensaje: p.nombre, enlace: `/proyectos/${proyectoId}` }, actorId);
  }, `acceso al proyecto ${proyectoId}`);
}

/** Observación de la entidad registrada (o reasignada): a su responsable, o al equipo si no tiene */
export function observacionRegistrada(observacionId: number, actorId: number, soloResponsable = false) {
  enSegundoPlano(async () => {
    const o = await prisma.observacionEntidad.findUnique({
      where: { id: observacionId },
      select: { numero: true, documento: true, fechaLimite: true, responsableId: true, proyecto: { select: { id: true, nombre: true } } },
    });
    if (!o || (soloResponsable && !o.responsableId)) return;
    const plazo = o.fechaLimite ? ` · plazo: ${o.fechaLimite.toISOString().slice(0, 10).split('-').reverse().join('/')}` : '';
    await notificar(
      o.responsableId ? [o.responsableId] : await equipoProyecto(o.proyecto.id),
      {
        tipo: 'OBSERVACION_ENTIDAD',
        titulo: `${soloResponsable ? 'Te asignaron' : 'Nueva'} observación de la entidad N.° ${o.numero}`,
        mensaje: `${o.proyecto.nombre} · ${recortar(o.documento, 80)}${plazo}`,
        enlace: `/proyectos/${o.proyecto.id}/contrato/observaciones`,
      },
      actorId,
    );
  }, `observación ${observacionId}`);
}

export function plazoAmpliado(ampliacionId: number, actorId: number) {
  enSegundoPlano(async () => {
    const a = await prisma.ampliacionPlazo.findUnique({
      where: { id: ampliacionId },
      select: { numero: true, diasAprobados: true, proyecto: { select: { id: true, nombre: true, fechaFin: true } } },
    });
    if (!a) return;
    await notificar(
      await equipoProyecto(a.proyecto.id),
      {
        tipo: 'PLAZO_AMPLIADO',
        titulo: `Plazo ampliado ${a.diasAprobados} días`,
        mensaje: `${a.proyecto.nombre} · nueva fecha de término: ${a.proyecto.fechaFin.toISOString().slice(0, 10).split('-').reverse().join('/')}`,
        enlace: `/proyectos/${a.proyecto.id}/contrato/plazo`,
      },
      actorId,
    );
  }, `ampliación ${ampliacionId}`);
}
