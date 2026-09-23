import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../config/env';
import type { UsuarioAutenticado } from '../types/express';

/** Exige un JWT válido en el header Authorization: Bearer <token> */
export function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & Partial<UsuarioAutenticado>;
    if (typeof payload.id !== 'number' || !Object.values(Rol).includes(payload.rol as Rol)) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    req.usuario = { id: payload.id, rol: payload.rol as Rol };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

/** Autoriza solo a los roles indicados. Debe ir después de verifyToken. */
export function requireRole(...rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ message: 'No tienes permiso para esta acción' });
    }
    next();
  };
}
