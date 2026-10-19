import type { NextFunction, Request, Response } from 'express';
import { storage } from '../../config/storage';
import * as planosService from './planos.service';
import * as avisos from '../notificaciones/notificaciones.eventos';
import type { ListarPlanosQuery } from './planos.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await planosService.listarPorProyecto(Number(req.params.id), req.query as ListarPlanosQuery));
}

export async function obtener(req: Request, res: Response) {
  res.json(await planosService.obtener(req.usuario, Number(req.params.id)));
}

export async function crear(req: Request, res: Response) {
  const plano = await planosService.crear(Number(req.params.id), req.usuario.id, req.body, req.file);
  if (plano && req.file) avisos.planoEnRevision(plano.id, req.usuario.id);
  res.status(201).json(plano);
}

/** Middleware: verifica acceso al proyecto del plano y define la carpeta destino antes de Multer */
export async function prepararSubida(req: Request, _res: Response, next: NextFunction) {
  req.proyectoIdUpload = await planosService.prepararSubida(req.usuario, Number(req.params.id));
  next();
}

export async function nuevaVersion(req: Request, res: Response) {
  const version = await planosService.nuevaVersion(Number(req.params.id), req.usuario.id, req.body, req.file);
  avisos.planoEnRevision(Number(req.params.id), req.usuario.id);
  res.status(201).json(version);
}

export async function actualizar(req: Request, res: Response) {
  const antes = req.body.estado ? await planosService.estadoActual(Number(req.params.id)) : null;
  const plano = await planosService.actualizar(Number(req.params.id), req.body);
  if (req.body.estado && req.body.estado !== antes) avisos.planoRevisado(plano.id, req.usuario.id);
  res.json(plano);
}

export async function descargarVersion(req: Request, res: Response) {
  const { ruta, nombreDescarga } = await planosService.obtenerArchivoVersion(req.usuario, Number(req.params.id));
  // ?ver=true muestra PDF/imágenes en el navegador; por defecto se descarga (DWG, RVT, ZIP…)
  const disposicion = req.query.ver === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombreDescarga)}`);
  await storage.enviar(res, ruta);
}

export async function eliminar(req: Request, res: Response) {
  await planosService.eliminar(Number(req.params.id));
  res.status(204).end();
}
