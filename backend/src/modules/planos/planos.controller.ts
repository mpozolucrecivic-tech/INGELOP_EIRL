import type { NextFunction, Request, Response } from 'express';
import * as planosService from './planos.service';
import type { ListarPlanosQuery } from './planos.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await planosService.listarPorProyecto(Number(req.params.id), req.query as ListarPlanosQuery));
}

export async function obtener(req: Request, res: Response) {
  res.json(await planosService.obtener(req.usuario, Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await planosService.crear(Number(req.params.id), req.usuario.id, req.body, req.file));
}

/** Middleware: verifica acceso al proyecto del plano y define la carpeta destino antes de Multer */
export async function prepararSubida(req: Request, _res: Response, next: NextFunction) {
  req.proyectoIdUpload = await planosService.prepararSubida(req.usuario, Number(req.params.id));
  next();
}

export async function nuevaVersion(req: Request, res: Response) {
  res.status(201).json(await planosService.nuevaVersion(Number(req.params.id), req.usuario.id, req.body, req.file));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await planosService.actualizar(Number(req.params.id), req.body));
}

export async function descargarVersion(req: Request, res: Response) {
  const { ruta, nombreDescarga } = await planosService.obtenerArchivoVersion(req.usuario, Number(req.params.id));
  // ?ver=true muestra PDF/imágenes en el navegador; por defecto se descarga (DWG, RVT, ZIP…)
  const disposicion = req.query.ver === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombreDescarga)}`);
  res.sendFile(ruta);
}

export async function eliminar(req: Request, res: Response) {
  await planosService.eliminar(Number(req.params.id));
  res.status(204).end();
}
