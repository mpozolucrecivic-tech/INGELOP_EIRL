import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { contextoDe, novedadesDeAcceso, registrar } from '../auditoria/auditoria.service';

/**
 * Inicio de sesión con auditoría: éxito (y si es desde una IP o navegador nuevo), fallo con su motivo
 * interno y bloqueo por cuenta. Los fallos se registran ANTES de responder: el bloqueo depende de ellos.
 */
export async function login(req: Request, res: Response) {
  const contexto = contextoDe(req);
  const correo = String(req.body.email);
  try {
    const resultado = await authService.login(req.body);
    const novedades = await novedadesDeAcceso(resultado.usuario.id, contexto.ip ?? null, contexto.navegador ?? null);
    await registrar({
      ...contexto, accion: 'LOGIN_OK', modulo: 'auth', resultado: 'EXITO', codigoHttp: 200, correo,
      usuarioId: resultado.usuario.id, usuarioNombre: resultado.usuario.nombre, detalle: novedades,
    });
    res.json(resultado);
  } catch (err) {
    if (err instanceof authService.LoginFallido) {
      await registrar({
        ...contexto,
        accion: err.motivo === 'cuenta bloqueada' ? 'LOGIN_BLOQUEADO' : 'LOGIN_FALLIDO',
        modulo: 'auth', resultado: 'FALLO', codigoHttp: err.statusCode, correo, usuarioId: err.usuarioId,
        detalle: { motivo: err.motivo },
      });
    }
    throw err;
  }
}

export async function me(req: Request, res: Response) {
  res.json(await authService.me(req.usuario.id));
}
