import type { Rol } from '@prisma/client';

export interface UsuarioAutenticado {
  id: number;
  rol: Rol;
}

declare global {
  namespace Express {
    interface Request {
      /** Payload del JWT. Siempre presente en rutas protegidas por verifyToken. */
      usuario: UsuarioAutenticado;
      /** Proyecto destino de un archivo cuando la ruta no lo trae en :id (ej. /planos/:id/versiones) */
      proyectoIdUpload?: number;
    }
  }
}
