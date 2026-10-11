import type { Request, Response } from 'express';
import * as auditoria from './auditoria.service';
import type { FiltrosAuditoria } from './auditoria.schema';

/** Consultar la auditoría también queda registrado (OWASP: registrar el acceso a los registros) */
const marcarConsulta = (res: Response, tipo: string) => {
  res.locals.auditoria = { accion: 'CONSULTA_AUDITORIA', modulo: 'auditoria', detalle: { tipo } };
};

export async function listar(req: Request, res: Response) {
  marcarConsulta(res, 'listado');
  res.json(await auditoria.listar(req.query as unknown as FiltrosAuditoria));
}

export async function exportar(req: Request, res: Response) {
  marcarConsulta(res, 'exportacion CSV');
  const csv = await auditoria.exportarCsv(req.query as unknown as FiltrosAuditoria);
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="auditoria-${fecha}.csv"`);
  res.send(csv);
}

export async function alertas(_req: Request, res: Response) {
  res.json(await auditoria.alertas());
}

export async function ultimosAccesos(_req: Request, res: Response) {
  res.json(await auditoria.ultimosAccesos());
}
