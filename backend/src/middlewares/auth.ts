import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../config/env';
import type { UsuarioAutenticado } from '../types/express';
import { prisma } from '../config/prisma';
import { contextoDe, registrarEnSegundoPlano } from '../modules/auditoria/auditoria.service';
import { marcar } from '../docs/marcas';

/** Exige un JWT válido en el header Authorization: Bearer <token> */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  // Un token vencido es normal (sesión expirada) y no se registra; uno con firma o contenido inválido sí:
  // indica que alguien lo alteró o fabricó.
  const alterado = (motivo: string) => {
    registrarEnSegundoPlano({ ...contextoDe(req), accion: 'TOKEN_ALTERADO', modulo: 'auth', resultado: 'FALLO', codigoHttp: 401, detalle: { motivo } });
    return res.status(401).json({ message: 'Token inválido o expirado' });
  };
  let payload: jwt.JwtPayload & Partial<UsuarioAutenticado>;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & Partial<UsuarioAutenticado>;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return res.status(401).json({ message: 'Token inválido o expirado' });
    return alterado('firma o formato inválido');
  }
  if (payload.purpose || typeof payload.id !== 'number' || !Object.values(Rol).includes(payload.rol as Rol)) {
    return alterado(payload.purpose ? 'token de otro propósito usado para iniciar sesión' : 'contenido inválido');
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: payload.id }, select: { id: true, rol: true, activo: true, nombre: true } });
  if (!usuario?.activo) {
    registrarEnSegundoPlano({
      ...contextoDe(req), accion: 'SESION_RECHAZADA', modulo: 'auth', resultado: 'FALLO', codigoHttp: 401,
      usuarioId: payload.id, usuarioNombre: usuario?.nombre ?? null, detalle: { motivo: usuario ? 'cuenta desactivada' : 'usuario inexistente' },
    });
    return res.status(401).json({ message: 'Usuario inactivo o no encontrado' });
  }
  req.usuario = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre };
  next();
}

/**
 * Jefatura o usuario con permiso "puede editar la web". Se consulta en la BD en cada petición,
 * así quitar el permiso tiene efecto inmediato. Debe ir después de verifyToken.
 */
export async function requireEditorWeb(req: Request, res: Response, next: NextFunction) {
  const u = await prisma.usuario.findUnique({ where: { id: req.usuario.id }, select: { activo: true, rol: true, puedeEditarWeb: true } });
  if (!u?.activo || (u.rol !== Rol.ADMIN && !u.puedeEditarWeb)) {
    return res.status(403).json({ message: 'No tienes permiso para esta acción' });
  }
  next();
}

/** Autoriza solo a los roles indicados. Debe ir después de verifyToken. */
export function requireRole(...rolesPermitidos: Rol[]) {
  return marcar(
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para esta acción' });
      }
      next();
    },
    { roles: rolesPermitidos },
  );
}

marcar(requireEditorWeb, { editorWeb: true });
