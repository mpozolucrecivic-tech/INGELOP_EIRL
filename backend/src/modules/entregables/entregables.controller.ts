import type { Request, Response } from 'express';
import * as entregablesService from './entregables.service';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await entregablesService.listarPorProyecto(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await entregablesService.crear(Number(req.params.id), req.body));
}

export async function aplicarPlantilla(req: Request, res: Response) {
  res.status(201).json(await entregablesService.aplicarPlantilla(Number(req.params.id)));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await entregablesService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await entregablesService.eliminar(Number(req.params.id));
  res.status(204).end();
}
