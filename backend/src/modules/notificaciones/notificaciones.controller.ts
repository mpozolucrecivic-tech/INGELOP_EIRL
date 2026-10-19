import type { Request, Response } from 'express';
import * as notificacionesService from './notificaciones.service';
import type { ListarNotificacionesQuery } from './notificaciones.schema';

export async function listar(req: Request, res: Response) {
  res.json(await notificacionesService.listar(req.usuario.id, req.query as unknown as ListarNotificacionesQuery));
}

export async function contador(req: Request, res: Response) {
  res.json(await notificacionesService.contador(req.usuario.id));
}

// Marcar como leída no es un cambio de datos del negocio: no se registra en la auditoría
export async function marcarLeida(req: Request, res: Response) {
  res.locals.sinAuditoria = true;
  await notificacionesService.marcarLeida(req.usuario.id, Number(req.params.id));
  res.status(204).end();
}

export async function marcarTodas(req: Request, res: Response) {
  res.locals.sinAuditoria = true;
  res.json(await notificacionesService.marcarTodas(req.usuario.id));
}
