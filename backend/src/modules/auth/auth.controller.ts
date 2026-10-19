import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as authService from './auth.service';
import { contextoDe, novedadesDeAcceso, registrar, registrarEnSegundoPlano } from '../auditoria/auditoria.service';
import { AppError } from '../../utils/AppError';

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

/** Público: el login muestra «¿Olvidaste tu contraseña?» solo si el correo está configurado */
export function opciones(_req: Request, res: Response) {
  res.json({ recuperacionContrasena: authService.recuperacionHabilitada() });
}

export async function cambiarContrasena(req: Request, res: Response) {
  const contexto = contextoDe(req);
  try {
    const { token, usuario } = await authService.cambiarContrasena(req.usuario.id, req.body);
    await registrar({ ...contexto, accion: 'CONTRASENA_CAMBIADA', modulo: 'auth', resultado: 'EXITO', codigoHttp: 200, registroId: String(usuario.id) });
    res.json({ token, message: 'Contraseña actualizada. Las sesiones abiertas en otros equipos se cerraron.' });
  } catch (err) {
    if (err instanceof ZodError) {
      registrarEnSegundoPlano({
        ...contexto, accion: 'CONTRASENA_CAMBIADA', modulo: 'auth', resultado: 'FALLO', codigoHttp: 422,
        registroId: String(req.usuario.id), detalle: { motivo: 'contraseña actual incorrecta' },
      });
    }
    throw err;
  }
}

const RESPUESTA_SOLICITUD = 'Si el correo pertenece a una cuenta activa, te enviamos un enlace para restablecer la contraseña. Revisa tu bandeja (y la carpeta de spam).';

export async function solicitarRecuperacion(req: Request, res: Response) {
  if (!authService.recuperacionHabilitada()) {
    throw new AppError(503, 'La recuperación por correo no está disponible. Pide a la jefatura que te asigne una contraseña nueva.');
  }
  const contexto = contextoDe(req);
  const correo = String(req.body.email);
  const r = await authService.solicitarRecuperacion(correo, contexto.ip ?? null);
  await registrar({
    ...contexto, accion: 'RECUPERACION_SOLICITADA', modulo: 'auth', resultado: r.enviado ? 'EXITO' : 'FALLO', codigoHttp: 200, correo,
    usuarioId: r.usuarioId ?? null, usuarioNombre: r.enviado ? r.nombre : null, detalle: r.enviado ? null : { motivo: r.motivo },
  });
  res.json({ message: RESPUESTA_SOLICITUD });
}

export async function restablecerContrasena(req: Request, res: Response) {
  const contexto = contextoDe(req);
  try {
    const usuario = await authService.restablecerContrasena(req.body);
    // Con el correo: un restablecimiento correcto reinicia el contador del bloqueo por cuenta
    await registrar({
      ...contexto, accion: 'CONTRASENA_RESTABLECIDA', modulo: 'auth', resultado: 'EXITO', codigoHttp: 200,
      correo: usuario.email, usuarioId: usuario.id, usuarioNombre: usuario.nombre, registroId: String(usuario.id),
    });
    res.json({ message: 'Listo: tu contraseña cambió. Ya puedes iniciar sesión con la nueva.' });
  } catch (err) {
    if (err instanceof authService.EnlaceInvalido) {
      await registrar({ ...contexto, accion: 'CONTRASENA_RESTABLECIDA', modulo: 'auth', resultado: 'FALLO', codigoHttp: 400, detalle: { motivo: err.motivo } });
    }
    throw err;
  }
}
