import type { Request, Response } from 'express';
import { storage } from '../../config/storage';
import * as avisos from '../notificaciones/notificaciones.eventos';
import * as contratoService from './contrato.service';
import type { ListarCorrespondenciaQuery, ListarObservacionesQuery } from './contrato.schema';

// ---------- Observaciones de la entidad ----------

export async function listarObservaciones(req: Request, res: Response) {
  res.json(await contratoService.listarObservaciones(Number(req.params.id), req.query as ListarObservacionesQuery));
}

export async function crearObservacion(req: Request, res: Response) {
  const observacion = await contratoService.crearObservacion(Number(req.params.id), req.body);
  avisos.observacionRegistrada(observacion.id, req.usuario.id);
  res.status(201).json(observacion);
}

export async function actualizarObservacion(req: Request, res: Response) {
  const antes = req.body.responsableId ? await contratoService.responsableObservacion(Number(req.params.id)) : undefined;
  const observacion = await contratoService.actualizarObservacion(req.usuario, Number(req.params.id), req.body);
  // Nuevo responsable asignado: se le avisa
  if (req.body.responsableId && req.body.responsableId !== antes) avisos.observacionRegistrada(observacion.id, req.usuario.id, true);
  res.json(observacion);
}

export async function eliminarObservacion(req: Request, res: Response) {
  await contratoService.eliminarObservacion(Number(req.params.id));
  res.status(204).end();
}

// ---------- Correspondencia ----------

export async function listarCorrespondencia(req: Request, res: Response) {
  res.json(await contratoService.listarCorrespondencia(Number(req.params.id), req.query as ListarCorrespondenciaQuery));
}

export async function siguienteNumeroCarta(_req: Request, res: Response) {
  res.json(await contratoService.siguienteNumeroCarta());
}

export async function crearCorrespondencia(req: Request, res: Response) {
  res.status(201).json(await contratoService.crearCorrespondencia(req.usuario.id, Number(req.params.id), req.body, req.file));
}

export async function actualizarCorrespondencia(req: Request, res: Response) {
  res.json(await contratoService.actualizarCorrespondencia(Number(req.params.id), req.body));
}

export async function descargarCorrespondencia(req: Request, res: Response) {
  const { ruta, nombre } = await contratoService.obtenerArchivoCorrespondencia(req.usuario, Number(req.params.id));
  const disposicion = req.query.ver === 'true' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposicion}; filename*=UTF-8''${encodeURIComponent(nombre)}`);
  await storage.enviar(res, ruta);
}

export async function eliminarCorrespondencia(req: Request, res: Response) {
  await contratoService.eliminarCorrespondencia(Number(req.params.id));
  res.status(204).end();
}

// ---------- Plazo y ampliaciones ----------

export async function listarAmpliaciones(req: Request, res: Response) {
  res.json(await contratoService.listarAmpliaciones(Number(req.params.id)));
}

export async function crearAmpliacion(req: Request, res: Response) {
  res.status(201).json(await contratoService.crearAmpliacion(Number(req.params.id), req.body));
}

export async function actualizarAmpliacion(req: Request, res: Response) {
  res.json(await contratoService.actualizarAmpliacion(Number(req.params.id), req.body));
}

export async function resolverAmpliacion(req: Request, res: Response) {
  const ampliacion = await contratoService.resolverAmpliacion(Number(req.params.id), req.body);
  if (ampliacion.estado === 'APROBADA') avisos.plazoAmpliado(ampliacion.id, req.usuario.id);
  res.json(ampliacion);
}

export async function eliminarAmpliacion(req: Request, res: Response) {
  await contratoService.eliminarAmpliacion(Number(req.params.id));
  res.status(204).end();
}
