import type { Request, Response } from 'express';
import * as evidenciasService from './evidencias.service';
import type { ListarEvidenciasQuery } from './evidencias.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await evidenciasService.listarPorProyecto(Number(req.params.id), req.query as ListarEvidenciasQuery));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await evidenciasService.crear(Number(req.params.id), req.usuario.id, req.body, req.file));
}

/** Descarga/visualización del archivo. inline permite mostrar imágenes y PDFs en el navegador. */
export async function descargarArchivo(req: Request, res: Response) {
  const { ruta, nombreDescarga } = await evidenciasService.obtenerArchivo(req.usuario, Number(req.params.id));
  const disposicion = req.query.descargar === 'true' ? 'attachment' : 'inline';
  res.setHeader('Content-Disposition', `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombreDescarga)}`);
  res.sendFile(ruta);
}

export async function eliminar(req: Request, res: Response) {
  await evidenciasService.eliminar(Number(req.params.id));
  res.status(204).end();
}
