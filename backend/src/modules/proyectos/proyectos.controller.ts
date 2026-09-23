import type { Request, Response } from 'express';
import * as proyectosService from './proyectos.service';
import type { ListarProyectosQuery } from './proyectos.schema';

export async function listar(req: Request, res: Response) {
  res.json(await proyectosService.listar(req.usuario, req.query as ListarProyectosQuery));
}

export async function obtener(req: Request, res: Response) {
  res.json(await proyectosService.obtener(Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await proyectosService.crear(req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await proyectosService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await proyectosService.eliminar(Number(req.params.id));
  res.status(204).end();
}

export async function listarUsuarios(req: Request, res: Response) {
  res.json(await proyectosService.listarUsuarios(Number(req.params.id)));
}

export async function asignarUsuario(req: Request, res: Response) {
  res.status(201).json(await proyectosService.asignarUsuario(Number(req.params.id), req.body.usuarioId));
}

export async function desasignarUsuario(req: Request, res: Response) {
  await proyectosService.desasignarUsuario(Number(req.params.id), Number(req.params.usuarioId));
  res.status(204).end();
}
