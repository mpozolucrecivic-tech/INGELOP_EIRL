import type { Request, Response } from 'express';
import * as sprintsService from './sprints.service';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await sprintsService.listarPorProyecto(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await sprintsService.crear(Number(req.params.id), req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await sprintsService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await sprintsService.eliminar(Number(req.params.id));
  res.status(204).end();
}
