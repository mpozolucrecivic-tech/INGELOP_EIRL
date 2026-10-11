import type { Request, Response } from 'express';
import * as usuariosService from './usuarios.service';
import type { ListarUsuariosQuery } from './usuarios.schema';

type Permisos = { rol: string; activo: boolean; puedeEditarWeb: boolean };
const CAMPOS_PERMISO = ['rol', 'activo', 'puedeEditarWeb'] as const;

/** Marca el evento de auditoría como CAMBIO_PERMISOS si cambió el rol, el estado o el permiso web */
function marcarCambioPermisos(res: Response, antes: Permisos | null, despues: Permisos, extra: Record<string, unknown> = {}) {
  const cambios = Object.fromEntries(
    CAMPOS_PERMISO.filter((c) => !antes || antes[c] !== despues[c]).map((c) => [c, { antes: antes?.[c] ?? null, despues: despues[c] }]),
  );
  if (Object.keys(cambios).length) {
    res.locals.auditoria = { accion: 'CAMBIO_PERMISOS', detalle: { cambios, ...extra } };
  }
}

export async function listar(req: Request, res: Response) {
  res.json(await usuariosService.listar(req.query as ListarUsuariosQuery));
}

export async function crear(req: Request, res: Response) {
  const usuario = await usuariosService.crear(req.body);
  marcarCambioPermisos(res, null, usuario, { nuevaCuenta: true });
  res.status(201).json(usuario);
}

export async function actualizar(req: Request, res: Response) {
  const antes = await usuariosService.permisos(Number(req.params.id));
  const usuario = await usuariosService.actualizar(Number(req.params.id), req.body, req.usuario.id);
  marcarCambioPermisos(res, antes, usuario, req.body.password ? { cambioContrasena: true } : {});
  res.json(usuario);
}

export async function eliminar(req: Request, res: Response) {
  const antes = await usuariosService.permisos(Number(req.params.id));
  await usuariosService.eliminar(Number(req.params.id), req.usuario.id);
  if (antes) marcarCambioPermisos(res, antes, { ...antes, activo: false }, { bajaLogica: true });
  res.status(204).end();
}
