import type { Request, Response } from 'express';
import * as documentosService from './documentos.service';
import type { DocumentosProyectoQuery, ListarDocumentosQuery } from './documentos.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await documentosService.listarPorProyecto(req.usuario, Number(req.params.id), req.query as DocumentosProyectoQuery));
}

export async function listarTodos(req: Request, res: Response) {
  res.json(await documentosService.listarTodos(req.query as unknown as ListarDocumentosQuery));
}

export async function listarMios(req: Request, res: Response) {
  res.json(await documentosService.listarMios(req.usuario, req.query as unknown as ListarDocumentosQuery));
}

export async function subir(req: Request, res: Response) {
  res.status(201).json(await documentosService.subir(req.usuario, Number(req.params.id), Number(req.params.etapaId), req.body, req.file));
}

/** Descarga (attachment) o vista en el navegador (?ver=true) */
export async function descargar(req: Request, res: Response) {
  const { ruta, nombre } = await documentosService.obtenerArchivo(req.usuario, Number(req.params.id));
  const disposicion = req.query.ver === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombre)}`);
  res.sendFile(ruta);
}

export async function editar(req: Request, res: Response) {
  res.json(await documentosService.editar(req.usuario, Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await documentosService.eliminar(Number(req.params.id));
  res.status(204).end();
}
