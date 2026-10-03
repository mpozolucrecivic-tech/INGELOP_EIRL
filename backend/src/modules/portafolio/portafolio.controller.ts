import type { Request, Response } from 'express';
import * as portafolioService from './portafolio.service';

export async function listarTodos(_req: Request, res: Response) {
  res.json(await portafolioService.listarTodos());
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await portafolioService.crear(req.body));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await portafolioService.actualizar(Number(req.params.id), req.body));
}

export async function ocultar(req: Request, res: Response) {
  await portafolioService.ocultar(Number(req.params.id));
  res.status(204).end();
}

/** Foto pública (la web la usa en <img>); se puede cachear porque la URL cambia con ?v= */
export async function verFoto(req: Request, res: Response) {
  const ruta = await portafolioService.obtenerFoto(Number(req.params.id));
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(ruta);
}

export async function cambiarFoto(req: Request, res: Response) {
  res.json(await portafolioService.cambiarFoto(Number(req.params.id), req.file));
}

export async function quitarFoto(req: Request, res: Response) {
  res.json(await portafolioService.quitarFoto(Number(req.params.id)));
}
