import type { Request, Response } from 'express';
import * as authService from './auth.service';

export async function login(req: Request, res: Response) {
  res.json(await authService.login(req.body));
}

export async function me(req: Request, res: Response) {
  res.json(await authService.me(req.usuario.id));
}
