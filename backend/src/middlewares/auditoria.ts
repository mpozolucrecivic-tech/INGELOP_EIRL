import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { contextoDe, limpiar, plantillaRuta, registrarEnSegundoPlano, type EventoAuditoria } from '../modules/auditoria/auditoria.service';

/** Asigna un identificador a cada petición (relaciona eventos) y lo devuelve en X-Request-Id */
export function idPeticion(req: Request, res: Response, next: NextFunction) {
  req.idPeticion = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.idPeticion);
  next();
}

const MUTACIONES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Último segmento de la ruta que indica una acción concreta
const ACCIONES_ESPECIALES: Record<string, string> = {
  publicar: 'PUBLICAR',
  retirar: 'RETIRAR',
  restaurar: 'RESTAURAR',
  'vista-previa': 'VISTA_PREVIA',
  duplicar: 'CREAR',
  enviar: 'ENVIAR_REVISION',
  aprobar: 'APROBAR',
  observar: 'OBSERVAR',
};
const CAMPO_SENSIBLE = /pass|token|secret|clave_?acceso/i;

/** Módulo a partir de la plantilla: /proyectos/:id/evidencias -> evidencias; /planos/:id -> planos */
function moduloDe(ruta: string): string {
  const literales = ruta.split('/').filter((s) => s && !s.startsWith(':') && !(s in ACCIONES_ESPECIALES));
  // Dentro de un proyecto manda el recurso más específico: /proyectos/:id/etapas/:id/documentos -> documentos
  if (literales[0] === 'proyectos' && literales.length > 1) return literales[literales.length - 1];
  return literales[0] ?? 'desconocido';
}

function accionDe(req: Request, ruta: string): string {
  const ultimo = ruta.split('/').filter(Boolean).at(-1) ?? '';
  if (req.method === 'GET') return ruta.endsWith('/archivo') ? 'DESCARGAR' : 'CONSULTAR';
  if (ACCIONES_ESPECIALES[ultimo]) return ACCIONES_ESPECIALES[ultimo];
  if (req.method === 'DELETE') return 'ELIMINAR';
  if (req.file) return 'SUBIR';
  if (req.method === 'POST') return 'CREAR';
  return 'EDITAR';
}

/** Qué cambió, sin valores: nombres de campos, si se cambió la contraseña y datos del archivo subido */
function detalleDe(req: Request): Record<string, unknown> | null {
  const detalle: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    const campos = Object.keys(req.body);
    const visibles = campos.filter((c) => !CAMPO_SENSIBLE.test(c));
    if (visibles.length) detalle.campos = visibles.slice(0, 40);
    if (campos.some((c) => /pass/i.test(c))) detalle.cambioContrasena = true;
  }
  if (req.file) detalle.archivo = { nombre: limpiar(req.file.originalname, 150), tamano: req.file.size, tipo: req.file.mimetype };
  return Object.keys(detalle).length ? detalle : null;
}

/**
 * Registra en la auditoría, al terminar cada petición de la intranet:
 * todas las modificaciones (crear, editar, eliminar, subir, publicar…), las descargas de archivos,
 * los accesos denegados (403) y los eventos que un controlador marque en res.locals.auditoria.
 * Va después de verifyToken. Si la auditoría falla, la petición del usuario no se interrumpe.
 */
export function auditarPeticion(req: Request, res: Response, next: NextFunction) {
  // Captura el id del registro creado (las respuestas de creación devuelven { id, ... })
  const jsonOriginal = res.json.bind(res);
  res.json = (cuerpo?: unknown) => {
    const id = cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo) ? (cuerpo as { id?: unknown }).id : undefined;
    if (typeof id === 'number' || typeof id === 'string') res.locals.auditoriaRegistroId = String(id);
    return jsonOriginal(cuerpo);
  };

  res.on('finish', () => {
    const ruta = plantillaRuta(req.originalUrl);
    const marcado = res.locals.auditoria as Partial<EventoAuditoria> | undefined;
    const esMutacion = MUTACIONES.has(req.method);
    const esDescarga = req.method === 'GET' && ruta.endsWith('/archivo');
    const denegado = res.statusCode === 403;
    if (!esMutacion && !esDescarga && !denegado && !marcado) return;

    const numeros = req.originalUrl.split('?')[0].match(/\/(\d+)(?=\/|$)/g);
    const claveCms = ruta.match(/\/cms\/documentos\/([a-z0-9.-]+)/)?.[1];
    const accion = accionDe(req, ruta);
    registrarEnSegundoPlano({
      ...contextoDe(req),
      accion: denegado ? 'ACCESO_DENEGADO' : accion,
      modulo: moduloDe(ruta),
      resultado: res.statusCode < 400 ? 'EXITO' : 'FALLO',
      codigoHttp: res.statusCode,
      registroId: res.locals.auditoriaRegistroId ?? claveCms ?? numeros?.at(-1)?.slice(1) ?? null,
      detalle: denegado ? { accionIntentada: accion } : detalleDe(req),
      ...marcado,
    });
  });
  next();
}
