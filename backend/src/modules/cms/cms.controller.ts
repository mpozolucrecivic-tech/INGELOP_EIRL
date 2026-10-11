import type { Request, Response } from 'express';
import * as cms from './cms.service';
import { contenidoWeb } from '../sitio/sitio.service';

// ---------- Públicas ----------

/** Contenido de la web con el borrador del documento en lugar de su versión publicada */
export async function vistaPrevia(req: Request, res: Response) {
  const preview = await cms.leerVistaPrevia(String(req.params.token));
  const web = await contenidoWeb();
  res.set('Cache-Control', 'no-store').json({ ...web, medios: await cms.medios(), cms: { ...web.cms, [preview.clave]: preview.contenido } });
}

/** Imagen pública: solo si la usa un documento publicado, o el borrador de una vista previa válida */
export async function archivoMedio(req: Request, res: Response) {
  const id = Number(req.params.id);
  const token = typeof req.query.vista_previa === 'string' ? req.query.vista_previa : null;
  const enVistaPrevia = token !== null && (await cms.medioEnVistaPrevia(token, id));
  if (token !== null) res.set('Cache-Control', 'no-store');
  res.sendFile(await cms.archivoMedio(id, enVistaPrevia));
}

// ---------- Intranet (jefatura o usuarios con permiso de editor web) ----------

export async function listar(_req: Request, res: Response) {
  res.json(await cms.listar());
}

export async function guardar(req: Request, res: Response) {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'GUARDAR', req.body.contenido));
}

export async function publicar(req: Request, res: Response) {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'PUBLICAR'));
}

export async function retirar(req: Request, res: Response) {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'RETIRAR'));
}

export async function historial(req: Request, res: Response) {
  res.json(await cms.historial(String(req.params.clave)));
}

export async function restaurar(req: Request, res: Response) {
  res.json(await cms.cambiar(String(req.params.clave), req.body.version, req.usuario.id, 'RESTAURAR', undefined, req.body.revisionId));
}

export async function crearVistaPrevia(req: Request, res: Response) {
  res.json(await cms.crearVistaPrevia(String(req.params.clave), req.body.version, req.usuario.id));
}

export async function listarMedios(_req: Request, res: Response) {
  res.json(await cms.medios());
}

export async function subirMedio(req: Request, res: Response) {
  res.status(201).json(await cms.subirMedio(req.file));
}

export async function editarMedio(req: Request, res: Response) {
  await cms.editarMedio(Number(req.params.id), req.body.textoAlternativo);
  res.json({ message: 'Texto alternativo guardado' });
}

export async function miniatura(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store').sendFile(await cms.archivoMedio(Number(req.params.id), true));
}
