import type { Request, Response } from 'express';
import * as cobrosService from './cobros.service';
import type { ListarCartasQuery, ListarCobrosQuery } from './cobros.schema';

// ---------- Cobros ----------

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await cobrosService.listarPorProyecto(Number(req.params.id)));
}

export async function listarTodos(req: Request, res: Response) {
  res.json(await cobrosService.listarTodos(req.query as ListarCobrosQuery));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await cobrosService.crear(Number(req.params.id), req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await cobrosService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await cobrosService.eliminar(Number(req.params.id));
  res.status(204).end();
}

// ---------- Cartas fianza ----------

export async function listarCartasPorProyecto(req: Request, res: Response) {
  res.json(await cobrosService.listarCartasPorProyecto(Number(req.params.id)));
}

export async function listarCartas(req: Request, res: Response) {
  res.json(await cobrosService.listarCartas(req.query as ListarCartasQuery));
}

export async function crearCarta(req: Request, res: Response) {
  res.status(201).json(await cobrosService.crearCarta(Number(req.params.id), req.body));
}

export async function actualizarCarta(req: Request, res: Response) {
  res.json(await cobrosService.actualizarCarta(Number(req.params.id), req.body));
}

export async function renovarCarta(req: Request, res: Response) {
  res.status(201).json(await cobrosService.renovarCarta(Number(req.params.id), req.body));
}

export async function eliminarCarta(req: Request, res: Response) {
  await cobrosService.eliminarCarta(Number(req.params.id));
  res.status(204).end();
}
