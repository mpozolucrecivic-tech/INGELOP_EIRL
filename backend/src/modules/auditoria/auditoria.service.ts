import crypto from 'node:crypto';
import type { Request } from 'express';
import { Prisma, type Auditoria } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import type { FiltrosAuditoria } from './auditoria.schema';

export type Resultado = 'EXITO' | 'FALLO';

export interface EventoAuditoria {
  accion: string;
  modulo: string;
  resultado: Resultado;
  registroId?: string | null;
  codigoHttp?: number | null;
  usuarioId?: number | null;
  usuarioNombre?: string | null;
  correo?: string | null;
  ip?: string | null;
  cadenaIp?: string | null;
  navegador?: string | null;
  metodo?: string | null;
  ruta?: string | null;
  idPeticion?: string | null;
  detalle?: Record<string, unknown> | null;
}

// ---------- Utilidades de limpieza (OWASP: evitar inyección en logs y datos de más) ----------

/** Quita saltos de línea y caracteres de control, y recorta */
export const limpiar = (v: unknown, max = 200): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};

/** IPv4 mapeada en IPv6 (::ffff:1.2.3.4) -> 1.2.3.4 */
const normalizarIp = (ip?: string | null) => (ip ? ip.replace(/^::ffff:/, '') : null);

/**
 * Plantilla de la ruta: sin query string, sin /api/v1, con los números como :id.
 * Así nunca se guardan tokens ni datos que viajen en la URL.
 */
export function plantillaRuta(url: string): string {
  const ruta = url.split('?')[0].replace(/^\/api\/v\d+/, '') || '/';
  return ruta
    .split('/')
    .map((seg) => (/^\d+$/.test(seg) ? ':id' : seg.length > 40 ? ':token' : seg))
    .join('/');
}

/** Quién y desde dónde: IP calculada por Express (TRUST_PROXY) + cadena completa para verificarla */
export function contextoDe(req: Request): Partial<EventoAuditoria> {
  const xff = req.headers['x-forwarded-for'];
  const cadena = [Array.isArray(xff) ? xff.join(', ') : xff, `socket=${normalizarIp(req.socket?.remoteAddress) ?? '?'}`]
    .filter(Boolean)
    .join(' | ');
  return {
    ip: limpiar(normalizarIp(req.ip), 64),
    cadenaIp: limpiar(cadena, 300),
    navegador: limpiar(req.get('user-agent'), 300),
    metodo: req.method,
    ruta: limpiar(plantillaRuta(req.originalUrl), 200),
    idPeticion: req.idPeticion ?? null,
    usuarioId: req.usuario?.id ?? null,
    usuarioNombre: limpiar(req.usuario?.nombre, 120),
  };
}

// ---------- Cadena de huellas ----------

/** JSON con las claves ordenadas: JSONB de PostgreSQL reordena las claves al guardarlas */
function jsonEstable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonEstable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonEstable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

type Fila = Omit<Auditoria, 'id' | 'hash'>;

export function calcularHash(f: Fila): string {
  const contenido = jsonEstable([
    f.hashAnterior, f.fecha.toISOString(), f.accion, f.modulo, f.registroId, f.resultado, f.codigoHttp,
    f.usuarioId, f.usuarioNombre, f.correo, f.ip, f.cadenaIp, f.navegador, f.metodo, f.ruta, f.idPeticion, f.detalle,
  ]);
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

const GENESIS = '0'.repeat(64);
const BLOQUEO_CADENA = 734_011; // id fijo del advisory lock que serializa las inserciones

/** Guarda un evento enlazado con el anterior. Las inserciones se serializan para no romper la cadena. */
export async function registrar(e: EventoAuditoria): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BLOQUEO_CADENA})`;
    const ultimo = await tx.auditoria.findFirst({ orderBy: { id: 'desc' }, select: { hash: true } });
    const fila: Fila = {
      fecha: new Date(),
      accion: e.accion,
      modulo: e.modulo,
      registroId: limpiar(e.registroId, 100),
      resultado: e.resultado,
      codigoHttp: e.codigoHttp ?? null,
      usuarioId: e.usuarioId ?? null,
      usuarioNombre: limpiar(e.usuarioNombre, 120),
      correo: limpiar(e.correo, 150),
      ip: e.ip ?? null,
      cadenaIp: e.cadenaIp ?? null,
      navegador: e.navegador ?? null,
      metodo: e.metodo ?? null,
      ruta: e.ruta ?? null,
      idPeticion: e.idPeticion ?? null,
      // Ida y vuelta por JSON: lo que se hashea es exactamente lo que se guarda
      detalle: e.detalle ? (JSON.parse(JSON.stringify(e.detalle)) as Prisma.JsonObject) : null,
      hashAnterior: ultimo?.hash ?? GENESIS,
    };
    await tx.auditoria.create({
      data: { ...fila, detalle: fila.detalle ?? Prisma.DbNull, hash: calcularHash(fila) },
    });
  });
}

/** Registra sin bloquear ni romper la petición: un fallo de la auditoría solo se informa en el log */
export function registrarEnSegundoPlano(e: EventoAuditoria): void {
  registrar(e).catch((err) => console.error('[AUDITORIA] No se pudo registrar el evento', e.accion, err));
}

// ---------- Inicio de sesión ----------

/** Fallos de inicio de sesión de un correo desde su último acceso correcto, dentro de la ventana de bloqueo */
export async function fallosRecientes(correo: string): Promise<number> {
  const desde = new Date(Date.now() - env.LOGIN_BLOQUEO_MIN * 60_000);
  const ultimoOk = await prisma.auditoria.findFirst({
    where: { correo, accion: 'LOGIN_OK', fecha: { gte: desde } },
    orderBy: { id: 'desc' },
    select: { fecha: true },
  });
  return prisma.auditoria.count({
    where: { correo, accion: 'LOGIN_FALLIDO', fecha: { gt: ultimoOk?.fecha ?? desde } },
  });
}

/** ¿Es la primera vez que este usuario entra desde esta IP o este navegador? (alerta de seguridad) */
export async function novedadesDeAcceso(usuarioId: number, ip: string | null, navegador: string | null) {
  const previos = await prisma.auditoria.count({ where: { usuarioId, accion: 'LOGIN_OK' } });
  if (previos === 0) return { primerAcceso: true };
  const [mismaIp, mismoNavegador] = await Promise.all([
    ip ? prisma.auditoria.count({ where: { usuarioId, accion: 'LOGIN_OK', ip } }) : 1,
    navegador ? prisma.auditoria.count({ where: { usuarioId, accion: 'LOGIN_OK', navegador } }) : 1,
  ]);
  return { ...(mismaIp === 0 && { ipNueva: true }), ...(mismoNavegador === 0 && { navegadorNuevo: true }) };
}

// ---------- Consultas (solo jefatura) ----------

function filtroWhere(f: FiltrosAuditoria): Prisma.AuditoriaWhereInput {
  return {
    ...((f.desde || f.hasta) && { fecha: { ...(f.desde && { gte: f.desde }), ...(f.hasta && { lte: f.hasta }) } }),
    ...(f.usuarioId && { usuarioId: f.usuarioId }),
    ...(f.modulo && { modulo: f.modulo }),
    ...(f.accion && { accion: f.accion }),
    ...(f.resultado && { resultado: f.resultado }),
    ...(f.ip && { ip: { contains: f.ip } }),
  };
}

export async function listar(f: FiltrosAuditoria) {
  const where = filtroWhere(f);
  const [total, registros] = await Promise.all([
    prisma.auditoria.count({ where }),
    prisma.auditoria.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (f.pagina - 1) * f.porPagina,
      take: f.porPagina,
      omit: { hash: true, hashAnterior: true },
    }),
  ]);
  return { total, pagina: f.pagina, porPagina: f.porPagina, registros };
}

/** Alertas de seguridad de las últimas 24 horas (y accesos nuevos de los últimos 7 días) */
export async function alertas() {
  const hace24h = new Date(Date.now() - 24 * 3600_000);
  const hace7d = new Date(Date.now() - 7 * 24 * 3600_000);
  const contar = (accion: string) => prisma.auditoria.count({ where: { accion, fecha: { gte: hace24h } } });
  const [loginsFallidos, bloqueos, accesosDenegados, tokensAlterados, ips, accesosNuevos] = await Promise.all([
    contar('LOGIN_FALLIDO'),
    contar('LOGIN_BLOQUEADO'),
    contar('ACCESO_DENEGADO'),
    contar('TOKEN_ALTERADO'),
    prisma.auditoria.groupBy({
      by: ['ip'],
      where: { accion: { in: ['LOGIN_FALLIDO', 'LOGIN_BLOQUEADO', 'TOKEN_ALTERADO', 'ACCESO_DENEGADO'] }, fecha: { gte: hace24h }, ip: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { ip: 'desc' } },
      take: 10,
    }),
    prisma.auditoria.findMany({
      where: {
        accion: 'LOGIN_OK',
        fecha: { gte: hace7d },
        OR: [{ detalle: { path: ['ipNueva'], equals: true } }, { detalle: { path: ['navegadorNuevo'], equals: true } }],
      },
      orderBy: { id: 'desc' },
      take: 20,
      select: { id: true, fecha: true, usuarioId: true, usuarioNombre: true, ip: true, navegador: true, detalle: true },
    }),
  ]);
  return {
    loginsFallidos,
    bloqueos,
    accesosDenegados,
    tokensAlterados,
    // Solo IPs con 3 o más eventos sospechosos
    ipsSospechosas: ips.filter((i) => i._count._all >= 3).map((i) => ({ ip: i.ip, eventos: i._count._all })),
    accesosNuevos,
  };
}

/** Último inicio de sesión correcto de cada usuario (fecha e IP) */
export async function ultimosAccesos() {
  return prisma.$queryRaw<{ usuarioId: number; fecha: Date; ip: string | null }[]>`
    SELECT DISTINCT ON ("usuarioId") "usuarioId", "fecha", "ip"
    FROM "Auditoria"
    WHERE "accion" = 'LOGIN_OK' AND "usuarioId" IS NOT NULL
    ORDER BY "usuarioId", "fecha" DESC`;
}

/** CSV para Excel (BOM UTF-8), con protección contra inyección de fórmulas. Máximo 10 000 filas. */
export async function exportarCsv(f: FiltrosAuditoria): Promise<string> {
  const filas = await prisma.auditoria.findMany({ where: filtroWhere(f), orderBy: { id: 'desc' }, take: 10_000, omit: { hash: true, hashAnterior: true } });
  const celda = (v: unknown) => {
    let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const columnas = ['id', 'fecha', 'accion', 'modulo', 'registroId', 'resultado', 'codigoHttp', 'usuarioId', 'usuarioNombre', 'correo', 'ip', 'cadenaIp', 'navegador', 'metodo', 'ruta', 'idPeticion', 'detalle'] as const;
  const lineas = [columnas.join(';'), ...filas.map((r) => columnas.map((c) => celda(r[c])).join(';'))];
  return '﻿' + lineas.join('\r\n');
}

// ---------- Integridad y conservación ----------

/** Recorre toda la tabla y comprueba cada huella y su enlace con la fila anterior */
export async function verificarCadena() {
  let anterior: string | null = null;
  let revisados = 0;
  let cursor = 0;
  const errores: { id: number; problema: string }[] = [];
  for (;;) {
    const lote = await prisma.auditoria.findMany({ where: { id: { gt: cursor } }, orderBy: { id: 'asc' }, take: 1000 });
    if (!lote.length) break;
    for (const fila of lote) {
      const { id, hash, ...resto } = fila;
      if (calcularHash(resto) !== hash) errores.push({ id, problema: 'El contenido no coincide con su huella (fila alterada)' });
      // La primera fila disponible puede tener un anterior ya purgado: se acepta como ancla
      if (anterior !== null && fila.hashAnterior !== anterior) errores.push({ id, problema: 'No enlaza con la fila anterior (filas borradas o insertadas)' });
      anterior = hash;
      cursor = id;
      revisados++;
    }
  }
  return { revisados, correcta: errores.length === 0, errores: errores.slice(0, 50) };
}

/** Borra lo más antiguo que el plazo de conservación (mínimo 2 años) y deja constancia en la auditoría */
export async function purgar() {
  const limite = new Date(Date.now() - env.AUDITORIA_RETENCION_DIAS * 24 * 3600_000);
  const borrados = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('ingelop.purga_auditoria', 'si', true)`;
    return (await tx.auditoria.deleteMany({ where: { fecha: { lt: limite } } })).count;
  });
  await registrar({
    accion: 'PURGA_AUDITORIA',
    modulo: 'auditoria',
    resultado: 'EXITO',
    detalle: { borrados, anterioresA: limite.toISOString(), retencionDias: env.AUDITORIA_RETENCION_DIAS },
  });
  return { borrados, limite };
}
