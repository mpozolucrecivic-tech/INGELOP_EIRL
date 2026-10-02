import type { Request, Response } from 'express';
import * as contactoService from './contacto.service';
import type { ListarMensajesQuery } from './contacto.schema';

export async function crear(req: Request, res: Response) {
  await contactoService.crear(req.body, req.ip);
  res.status(201).json({ message: '¡Mensaje enviado! Gracias por escribirnos. Te responderemos a la brevedad.' });
}

export async function listar(req: Request, res: Response) {
  res.json(await contactoService.listar(req.query as ListarMensajesQuery));
}

export async function marcarLeido(req: Request, res: Response) {
  res.json(await contactoService.marcarLeido(Number(req.params.id), req.body.leido));
}
