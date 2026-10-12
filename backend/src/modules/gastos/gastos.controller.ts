import type { Request, Response } from 'express';
import * as gastosService from './gastos.service';
import type { ImportarGastosInput, ListarGastosQuery } from './gastos.schema';

export async function listarPorProyecto(req: Request, res: Response) {
  res.json(await gastosService.listarPorProyecto(Number(req.params.id), req.query as ListarGastosQuery));
}

export async function crear(req: Request, res: Response) {
  res.status(201).json(await gastosService.crear(Number(req.params.id), req.body));
}

export async function listarEmpresa(req: Request, res: Response) {
  res.json(await gastosService.listarEmpresa(req.query as ListarGastosQuery));
}

export async function crearEmpresa(req: Request, res: Response) {
  res.status(201).json(await gastosService.crear(null, req.body));
}

export async function resumenEmpresa(req: Request, res: Response) {
  res.json(await gastosService.resumenEmpresa(req.query as ListarGastosQuery));
}

export async function actualizar(req: Request, res: Response) {
  res.json(await gastosService.actualizar(Number(req.params.id), req.body));
}

export async function eliminar(req: Request, res: Response) {
  await gastosService.eliminar(Number(req.params.id));
  res.status(204).end();
}

export async function resumen(req: Request, res: Response) {
  res.json(await gastosService.resumen(Number(req.params.id)));
}

export async function verificarImportacion(req: Request, res: Response) {
  res.json(await gastosService.verificarImportacion(req.body.filas));
}

export async function importar(req: Request, res: Response) {
  const body = req.body as ImportarGastosInput;
  const importacion = await gastosService.importar(body, req.usuario!.id);
  res.locals.auditoria = {
    detalle: { archivo: body.nombreArchivo, filas: importacion.cantidad, total: importacion.total, origenProyectoId: body.origenProyectoId },
  };
  res.status(201).json(importacion);
}

export async function listarImportaciones(req: Request, res: Response) {
  res.json(await gastosService.listarImportaciones((req.query as { proyectoId?: number }).proyectoId));
}

export async function deshacerImportacion(req: Request, res: Response) {
  const resultado = await gastosService.deshacerImportacion(Number(req.params.id));
  res.locals.auditoria = { accion: 'DESHACER_IMPORTACION', detalle: { gastosEliminados: resultado.gastosEliminados } };
  res.json(resultado);
}
