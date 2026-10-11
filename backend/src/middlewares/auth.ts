import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import { env } from '../config/env';
import type { UsuarioAutenticado } from '../types/express';
import { prisma } from '../config/prisma';

/** Exige un JWT válido en el header Authorization: Bearer <token> */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & Partial<UsuarioAutenticado>;
    if (payload.purpose || typeof payload.id !== 'number' || !Object.values(Rol).includes(payload.rol as Rol)) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
  const payload = jwt.decode(token) as jwt.JwtPayload;
  const usuario = await prisma.usuario.findUnique({ where: { id: payload.id }, select: { id: true, rol: true, activo: true } });
  if (!usuario?.activo) return res.status(401).json({ message: 'Usuario inactivo o no encontrado' });
  req.usuario = { id: usuario.id, rol: usuario.rol };
  next();
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
