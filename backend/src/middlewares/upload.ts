import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env';
import { storage, toStorageKey } from '../config/storage';
import { AppError } from '../utils/AppError';
import { EXTENSIONES_DOCUMENTO } from '../utils/firmaArchivo';
import { marcar } from '../docs/marcas';

interface UploadOptions {
  /** Subcarpeta dentro de UPLOAD_DIR para la petición (ej. "proyectos/3/planos") */
  carpeta: (req: Request) => string;
  /** Devuelve un mensaje de error si el archivo no está permitido */
  validar: (file: Express.Multer.File, ext: string) => string | null;
  /** Tamaño máximo en MB (por defecto MAX_UPLOAD_MB) */
  maxMB?: number;
}

/**
 * Crea un middleware que recibe un archivo opcional en el campo "archivo" (multipart/form-data).
 * Multer lo guarda en disco; con STORAGE_DRIVER=s3 se sube además al bucket ANTES de que el servicio
 * escriba en la BD (la copia local se conserva hasta el final para que el servicio pueda revisar su firma).
 * Al terminar la petición: si hubo error (validación, permisos, BD...) se borra el archivo del disco y del
 * bucket, así nunca quedan archivos huérfanos; en modo s3 la copia local se borra siempre.
 */
function crearUpload({ carpeta, validar, maxMB = env.MAX_UPLOAD_MB }: UploadOptions): RequestHandler {
  const handler = multer({
    storage: multer.diskStorage({
      destination(req, _file, cb) {
        const dir = path.join(env.UPLOAD_PATH, carpeta(req));
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
      },
    }),
    limits: { fileSize: maxMB * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
      const error = validar(file, path.extname(file.originalname).toLowerCase());
      if (error) return cb(AppError.badRequest(error));
      cb(null, true);
    },
  }).single('archivo');

  return marcar<RequestHandler>((req, res, next) => {
    res.on('finish', () => {
      const archivo = req.file;
      if (!archivo?.path) return;
      if (res.statusCode >= 400 || storage.remoto) fs.rm(archivo.path, { force: true }, () => {});
      if (res.statusCode >= 400 && storage.remoto && res.locals.subidoAlAlmacenamiento) {
        storage.remove(toStorageKey(archivo.path)).catch((e) => console.error('[ALMACENAMIENTO] No se pudo borrar el archivo huérfano', e));
      }
    });
    handler(req, res, (err?: unknown) => {
      if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, `El archivo supera el máximo de ${maxMB} MB`));
      }
      if (err || !req.file || !storage.remoto) return next(err);
      storage
        .subir(req.file.path, toStorageKey(req.file.path), req.file.mimetype)
        .then(() => {
          res.locals.subidoAlAlmacenamiento = true;
          next();
        })
        .catch((e) => {
          console.error('[ALMACENAMIENTO] No se pudo subir el archivo', e);
          next(new AppError(502, 'No se pudo guardar el archivo en el almacenamiento. Inténtalo de nuevo.'));
        });
    });
  }, { subida: { maxMB } });
}

// ---------- Evidencias / documentos ----------

/** mimetype -> extensiones válidas */
const TIPOS_EVIDENCIA: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
};

/** Guarda en <UPLOAD_DIR>/proyectos/<id>/ (req.params.id ya validado y con acceso verificado) */
export const uploadEvidencia = crearUpload({
  carpeta: (req) => path.join('proyectos', String(Number(req.params.id))),
  validar: (file, ext) =>
    TIPOS_EVIDENCIA[file.mimetype]?.includes(ext) ? null : `Tipo de archivo no permitido (${file.mimetype || ext || 'desconocido'})`,
});

// ---------- Planos ----------

/**
 * Formatos de planos. Se valida por extensión porque los navegadores suelen enviar
 * DWG/DXF/RVT como application/octet-stream.
 */
export const EXTENSIONES_PLANO = ['.pdf', '.dwg', '.dxf', '.rvt', '.ifc', '.skp', '.jpg', '.jpeg', '.png', '.zip'];

/** Guarda en <UPLOAD_DIR>/proyectos/<proyectoId>/planos/ — req.proyectoIdUpload lo define la ruta */
export const uploadPlano = crearUpload({
  carpeta: (req) => path.join('proyectos', String(req.proyectoIdUpload ?? Number(req.params.id)), 'planos'),
  validar: (_file, ext) =>
    EXTENSIONES_PLANO.includes(ext) ? null : `Formato de plano no permitido (${ext || 'sin extensión'}). Use: ${EXTENSIONES_PLANO.join(', ')}`,
});

// ---------- Fotos de servicios (web pública) ----------

const TIPOS_FOTO: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

export const uploadFotoCms = crearUpload({
  carpeta: () => 'cms', maxMB: env.MAX_FOTO_MB,
  validar: (file, ext) => TIPOS_FOTO[file.mimetype]?.includes(ext) ? null : 'Use JPG, PNG o WEBP',
});

/** Guarda en <UPLOAD_DIR>/servicios/ con tamaño máximo MAX_FOTO_MB */
export const uploadFotoServicio = crearUpload({
  carpeta: () => 'servicios',
  maxMB: env.MAX_FOTO_MB,
  validar: (file, ext) =>
    TIPOS_FOTO[file.mimetype]?.includes(ext) ? null : 'Formato de foto no permitido. Use JPG, PNG o WEBP',
});

/** Fotos del portafolio de la web: <UPLOAD_DIR>/portafolio/, mismas reglas que las de servicios */
export const uploadFotoPortafolio = crearUpload({
  carpeta: () => 'portafolio',
  maxMB: env.MAX_FOTO_MB,
  validar: (file, ext) =>
    TIPOS_FOTO[file.mimetype]?.includes(ext) ? null : 'Formato de foto no permitido. Use JPG, PNG o WEBP',
});

// ---------- Documentos de las etapas (gestión documental) ----------

/**
 * Guarda en <UPLOAD_DIR>/proyectos/<id>/documentos/. Aquí se filtra por extensión (los navegadores envían
 * DWG/DXF como application/octet-stream); el servicio verifica además la firma real del archivo.
 */
export const uploadDocumento = crearUpload({
  carpeta: (req) => path.join('proyectos', String(Number(req.params.id)), 'documentos'),
  validar: (_file, ext) =>
    EXTENSIONES_DOCUMENTO.includes(ext)
      ? null
      : `Formato no permitido (${ext || 'sin extensión'}). Use PDF, Word, Excel, imágenes, DWG, DXF o ZIP`,
});
