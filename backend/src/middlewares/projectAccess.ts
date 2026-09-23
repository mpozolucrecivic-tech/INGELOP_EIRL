import type { RequestHandler } from 'express';
import { assertProjectAccess } from '../utils/access';

/**
 * Verifica que el usuario pueda acceder al proyecto de req.params[param] (por defecto :id).
 * Va después de validate({ params }) para que el id ya sea numérico.
 * En Express 5 los errores de middlewares async llegan solos al errorHandler.
 */
export const requireProjectAccess =
  (param = 'id'): RequestHandler =>
  async (req, _res, next) => {
    await assertProjectAccess(req.usuario, Number(req.params[param]));
    next();
  };
