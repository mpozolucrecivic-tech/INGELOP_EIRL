import type { Request, Response } from 'express';
import * as etapasService from './etapas.service';
import * as avisos from '../notificaciones/notificaciones.eventos';

export async function listar(req: Request, res: Response) {
  res.json(await etapasService.listar(Number(req.params.id)));
}

export async function iniciar(req: Request, res: Response) {
  res.status(201).json(await etapasService.iniciar(Number(req.params.id), req.body));
}

export async function editarFechas(req: Request, res: Response) {
  res.json(await etapasService.editarFechas(Number(req.params.id), req.body));
}

export async function enviarARevision(req: Request, res: Response) {
  const etapa = await etapasService.enviarARevision(req.usuario, Number(req.params.id));
  avisos.etapaCambioEstado(etapa.id, req.usuario.id);
  res.json(etapa);
}

export async function aprobar(req: Request, res: Response) {
  const etapa = await etapasService.aprobar(Number(req.params.id));
  avisos.etapaCambioEstado(etapa.id, req.usuario.id);
  res.json(etapa);
}

export async function observar(req: Request, res: Response) {
  const etapa = await etapasService.observar(Number(req.params.id), req.body.observacion, req.usuario.id);
  avisos.etapaCambioEstado(etapa.id, req.usuario.id);
  res.json(etapa);
}

export async function eliminar(req: Request, res: Response) {
  await etapasService.eliminar(Number(req.params.id));
  res.status(204).end();
}
