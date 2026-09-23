import type { Request, Response } from 'express';
import * as usuariosService from './usuarios.service';
import type { ListarUsuariosQuery } from './usuarios.schema';

export async function listar(req: Request, res: Response) {
  res.json(await usuariosService.listar(req.query as ListarUsuariosQuery));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await usuariosService.crear(req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await usuariosService.actualizar(Number(req.params.id), req.body, req.usuario.id));
}

export async function eliminar(req: Request, res: Response) {
  await usuariosService.eliminar(Number(req.params.id), req.usuario.id);
  res.status(204).end();
}
