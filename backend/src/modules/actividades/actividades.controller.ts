import type { Request, Response } from 'express';
import * as actividadesService from './actividades.service';
import type { ListarActividadesQuery } from './actividades.schema';

export async function listarPorSprint(req: Request, res: Response) {
  res.json(
    await actividadesService.listarPorSprint(req.usuario, Number(req.params.id), req.query as ListarActividadesQuery),
  );
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await actividadesService.crear(req.usuario, Number(req.params.id), req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await actividadesService.actualizar(req.usuario, Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await actividadesService.eliminar(Number(req.params.id));
  res.status(204).end();
}
