import fs from 'node:fs';
import path from 'node:path';
import { env } from './env';

/**
 * Abstracción mínima del almacenamiento de archivos.
 * Hoy: disco local en UPLOAD_DIR. Para migrar a S3/Cloudinary basta con implementar
 * esta interfaz (y cambiar el storage de Multer en middlewares/upload.ts).
 * En BD se guarda siempre la "key" relativa (ej. "proyectos/3/1695000000-foto.jpg").
 */
export interface StorageProvider {
  /** Ruta absoluta (local) del archivo, para servirlo con res.sendFile */
  resolve(key: string): string;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}

/** Resuelve la key dentro de UPLOAD_PATH e impide escapar de la carpeta (path traversal) */
const safeJoin = (key: string) => {
  const full = path.resolve(env.UPLOAD_PATH, key);
  if (!full.startsWith(env.UPLOAD_PATH + path.sep)) throw new Error('Ruta de archivo inválida');
  return full;
};

const localStorageProvider: StorageProvider = {
  resolve: safeJoin,
  async exists(key) {
    try {
      await fs.promises.access(safeJoin(key));
      return true;
    } catch {
      return false;
    }
  },
  async remove(key) {
    await fs.promises.rm(safeJoin(key), { force: true });
  },
  async removePrefix(prefix) {
    await fs.promises.rm(safeJoin(prefix), { recursive: true, force: true });
  },
};

export const storage: StorageProvider = localStorageProvider;

/** Convierte la ruta absoluta que deja Multer en la key relativa que se guarda en BD */
export const toStorageKey = (absolutePath: string) =>
  path.relative(env.UPLOAD_PATH, absolutePath).split(path.sep).join('/');
