import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { Response } from 'express';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { env } from './env';
import { AppError } from '../utils/AppError';

/**
 * Almacenamiento de archivos (planos, documentos, fotos…). En BD se guarda siempre la "key" relativa
 * (ej. "proyectos/3/documentos/1695000000-a1b2.pdf"), igual en los dos modos:
 *
 *  - STORAGE_DRIVER=local: disco en UPLOAD_DIR (desarrollo, VPS con volumen persistente).
 *  - STORAGE_DRIVER=s3: Cloudflare R2 u otro servicio compatible con S3 (Render, cuyo disco se borra).
 *
 * Multer siempre guarda primero en disco (UPLOAD_DIR como carpeta temporal); en modo s3 el middleware
 * de subida lo sube al bucket ANTES de que se guarde el registro en la BD (ver middlewares/upload.ts).
 */
export interface StorageProvider {
  /** true si los archivos viven fuera del disco local (S3/R2) */
  readonly remoto: boolean;
  /** Sube al almacenamiento el archivo temporal que dejó Multer (en local no hace nada: ya está en su sitio) */
  subir(rutaLocal: string, key: string, tipo?: string): Promise<void>;
  /** Envía el archivo como respuesta HTTP (Content-Disposition debe fijarse antes) */
  enviar(res: Response, key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  remove(key: string): Promise<void>;
  /** Mueve un archivo (se usa para la papelera al eliminar documentos) */
  move(from: string, to: string): Promise<void>;
  removePrefix(prefix: string): Promise<void>;
}

/** Resuelve la key dentro de UPLOAD_PATH e impide escapar de la carpeta (path traversal) */
const safeJoin = (key: string) => {
  const full = path.resolve(env.UPLOAD_PATH, key);
  if (!full.startsWith(env.UPLOAD_PATH + path.sep)) throw new Error('Ruta de archivo inválida');
  return full;
};

/** Rechaza keys con "..", rutas absolutas o barras invertidas también en S3 */
const keySegura = (key: string) => {
  if (!key || key.startsWith('/') || key.includes('\\') || key.split('/').some((s) => s === '..' || s === '.')) {
    throw new Error('Ruta de archivo inválida');
  }
  return key;
};

const localStorageProvider: StorageProvider = {
  remoto: false,
  async subir() {
    /* Multer ya lo dejó en UPLOAD_DIR/<key> */
  },
  async enviar(res, key) {
    const ruta = safeJoin(key);
    if (!(await this.exists(key))) throw AppError.notFound('El archivo ya no está disponible');
    await new Promise<void>((resolve, reject) => res.sendFile(ruta, (err) => (err ? reject(err) : resolve())));
  },
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
  async move(from, to) {
    const destino = safeJoin(to);
    await fs.promises.mkdir(path.dirname(destino), { recursive: true });
    await fs.promises.rename(safeJoin(from), destino);
  },
  async removePrefix(prefix) {
    await fs.promises.rm(safeJoin(prefix), { recursive: true, force: true });
  },
};

// ---------- S3 / Cloudflare R2 ----------

const TIPOS: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8',
};
const tipoDe = (key: string) => TIPOS[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
const noExiste = (err: unknown) => err instanceof NoSuchKey || err instanceof NotFound || (err as { name?: string })?.name === 'NotFound';

function crearS3Provider(): StorageProvider {
  const bucket = env.S3_BUCKET!;
  const s3 = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
  });

  const provider: StorageProvider = {
    remoto: true,
    async subir(rutaLocal, key, tipo) {
      const { size } = await fs.promises.stat(rutaLocal);
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: keySegura(key),
          Body: fs.createReadStream(rutaLocal),
          ContentLength: size,
          ContentType: tipo && tipo !== 'application/octet-stream' ? tipo : tipoDe(key),
        }),
      );
    },
    async enviar(res, key) {
      try {
        const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: keySegura(key) }));
        res.setHeader('Content-Type', obj.ContentType ?? tipoDe(key));
        if (obj.ContentLength !== undefined) res.setHeader('Content-Length', String(obj.ContentLength));
        await new Promise<void>((resolve, reject) => {
          const cuerpo = obj.Body as Readable;
          cuerpo.on('error', reject);
          res.on('finish', resolve);
          res.on('close', resolve);
          cuerpo.pipe(res);
        });
      } catch (err) {
        if (noExiste(err)) throw AppError.notFound('El archivo ya no está disponible');
        throw err;
      }
    },
    async exists(key) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: keySegura(key) }));
        return true;
      } catch (err) {
        if (noExiste(err)) return false;
        throw err;
      }
    },
    async remove(key) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: keySegura(key) }));
    },
    async move(from, to) {
      await s3.send(new CopyObjectCommand({ Bucket: bucket, Key: keySegura(to), CopySource: `${bucket}/${encodeURIComponent(keySegura(from)).replace(/%2F/g, '/')}` }));
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: from }));
    },
    async removePrefix(prefix) {
      const base = `${keySegura(prefix).replace(/\/$/, '')}/`;
      let token: string | undefined;
      do {
        const lista = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: base, ContinuationToken: token }));
        const objetos = (lista.Contents ?? []).filter((o) => o.Key).map((o) => ({ Key: o.Key! }));
        if (objetos.length) await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objetos, Quiet: true } }));
        token = lista.IsTruncated ? lista.NextContinuationToken : undefined;
      } while (token);
    },
  };
  return provider;
}

export const storage: StorageProvider = env.STORAGE_DRIVER === 's3' ? crearS3Provider() : localStorageProvider;

/** Convierte la ruta absoluta que deja Multer en la key relativa que se guarda en BD */
export const toStorageKey = (absolutePath: string) =>
  path.relative(env.UPLOAD_PATH, absolutePath).split(path.sep).join('/');
