import type { Request, Response } from 'express';
import * as gastosService from './gastos.service';
import type { ListarGastosQuery } from './gastos.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await gastosService.listarPorProyecto(Number(req.params.id), req.query as ListarGastosQuery));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await gastosService.crear(Number(req.params.id), req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await gastosService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await gastosService.eliminar(Number(req.params.id));
  res.status(204).end();
}

export async function resumen(req: Request, res: Response) {
  res.json(await gastosService.resumen(Number(req.params.id)));
}
