import type { Request, Response } from 'express';
import * as sitioService from './sitio.service';

export async function contenidoWeb(_req: Request, res: Response) {
  res.json(await sitioService.contenidoWeb());
}

export async function listar(_req: Request, res: Response) {
  res.json(await sitioService.listar());
}

export async function guardar(req: Request, res: Response) {
  res.json(await sitioService.guardar(req.body));
}
