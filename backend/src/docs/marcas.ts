import type { ZodTypeAny } from 'zod';

/**
 * Información que algunos middlewares dejan para la documentación Swagger (src/docs/openapi.ts).
 * No cambia su comportamiento: solo permite generar la documentación leyendo las rutas reales.
 */
export interface MarcaDocs {
  esquemas?: { params?: ZodTypeAny; query?: ZodTypeAny; body?: ZodTypeAny };
  roles?: string[];
  editorWeb?: true;
  accesoProyecto?: true;
  subida?: { maxMB: number };
  limite?: string;
}

export const MARCA = '__docs';

export function marcar<T extends object>(fn: T, marca: MarcaDocs): T {
  return Object.assign(fn, { [MARCA]: marca });
}

export const leerMarca = (fn: unknown): MarcaDocs | undefined =>
  fn && typeof fn === 'function' ? (fn as unknown as Record<string, MarcaDocs | undefined>)[MARCA] : undefined;
