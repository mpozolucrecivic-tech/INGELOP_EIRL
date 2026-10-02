import type { Request, Response } from 'express';
import * as serviciosService from './servicios.service';

export async function listarActivos(_req: Request, res: Response) {
  res.json(await serviciosService.listarActivos());
}

export async function listarTodos(_req: Request, res: Response) {
  res.json(await serviciosService.listarTodos());
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await serviciosService.crear(req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await serviciosService.actualizar(Number(req.params.id), req.body));
}

export async function desactivar(req: Request, res: Response) {
  await serviciosService.desactivar(Number(req.params.id));
  res.status(204).end();
}

/** Foto pública (la usa la web en <img>); se puede cachear porque la URL cambia con ?v= */
export async function verFoto(req: Request, res: Response) {
  const ruta = await serviciosService.obtenerFoto(Number(req.params.id));
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(ruta);
}

export async function cambiarFoto(req: Request, res: Response) {
  res.json(await serviciosService.cambiarFoto(Number(req.params.id), req.file));
}

export async function quitarFoto(req: Request, res: Response) {
  res.json(await serviciosService.quitarFoto(Number(req.params.id)));
}
