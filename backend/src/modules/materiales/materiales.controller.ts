import type { Request, Response } from 'express';
import * as materialesService from './materiales.service';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await materialesService.listarPorProyecto(Number(req.params.id)));
}

export async function alertas(req: Request, res: Response) {
  res.json(await materialesService.alertasPorProyecto(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await materialesService.crear(Number(req.params.id), req.usuario.id, req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await materialesService.actualizar(Number(req.params.id), req.body));
}

export async function listarMovimientos(req: Request, res: Response) {
  res.json(await materialesService.listarMovimientos(Number(req.params.id)));
}

export async function registrarMovimiento(req: Request, res: Response) {
  res.status(201).json(await materialesService.registrarMovimiento(Number(req.params.id), req.usuario.id, req.body));
}
