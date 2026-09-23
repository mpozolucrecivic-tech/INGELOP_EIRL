import type { Request, Response } from 'express';
import * as presupuestosService from './presupuestos.service';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await presupuestosService.listarPorProyecto(Number(req.params.id)));
}

export async function obtener(req: Request, res: Response) {
  res.json(await presupuestosService.obtener(req.usuario, Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await presupuestosService.crear(Number(req.params.id), req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await presupuestosService.actualizar(req.usuario, Number(req.params.id), req.body));
}

export async function guardarPartidas(req: Request, res: Response) {
  res.json(await presupuestosService.guardarPartidas(req.usuario, Number(req.params.id), req.body.partidas));
}

export async function duplicar(req: Request, res: Response) {
  res.status(201).json(await presupuestosService.duplicar(req.usuario, Number(req.params.id)));
}

export async function eliminar(req: Request, res: Response) {
  await presupuestosService.eliminar(Number(req.params.id));
  res.status(204).end();
}
