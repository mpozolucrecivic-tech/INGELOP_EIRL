import type { Request, Response } from 'express';
import * as clientesService from './clientes.service';
import type { ListarClientesQuery } from './clientes.schema';

export async function listar(req: Request, res: Response) {
  res.json(await clientesService.listar(req.query as ListarClientesQuery));
}

export async function obtener(req: Request, res: Response) {
  res.json(await clientesService.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await clientesService.crear(req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await clientesService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await clientesService.eliminar(Number(req.params.id));
  res.status(204).end();
}
