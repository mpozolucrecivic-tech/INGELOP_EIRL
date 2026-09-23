import type { Request, Response } from 'express';
import * as personalService from './personal.service';
import type { ListarRegistrosQuery, ListarTrabajadoresQuery } from './personal.schema';

type RangoFechas = { desde?: Date; hasta?: Date };

export async function listarTrabajadores(req: Request, res: Response) {
  res.json(await personalService.listarTrabajadores(req.query as ListarTrabajadoresQuery));
}

export async function crearTrabajador(req: Request, res: Response) {
  res.status(201).json(await personalService.crearTrabajador(req.body));
}

export async function actualizarTrabajador(req: Request, res: Response) {
  res.json(await personalService.actualizarTrabajador(Number(req.params.id), req.body));
}

export async function listarAsignaciones(req: Request, res: Response) {
  res.json(await personalService.listarAsignaciones(Number(req.params.id)));
}

export async function crearAsignacion(req: Request, res: Response) {
  res.status(201).json(await personalService.crearAsignacion(Number(req.params.id), req.body));
}

export async function cerrarAsignacion(req: Request, res: Response) {
  res.json(await personalService.cerrarAsignacion(Number(req.params.id), req.body.fechaFin));
}

export async function registrarHoras(req: Request, res: Response) {
  res.status(201).json(await personalService.registrarHoras(Number(req.params.id), req.body));
}

export async function listarRegistros(req: Request, res: Response) {
  res.json(await personalService.listarRegistros(Number(req.params.id), req.query as ListarRegistrosQuery));
}

export async function eliminarRegistro(req: Request, res: Response) {
  await personalService.eliminarRegistro(Number(req.params.id));
  res.status(204).end();
}

export async function resumenHoras(req: Request, res: Response) {
  const { desde, hasta } = req.query as RangoFechas;
  res.json(await personalService.resumenHoras(Number(req.params.id), desde, hasta));
}
