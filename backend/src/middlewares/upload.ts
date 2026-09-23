import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

interface UploadOptions {
  /** Subcarpeta dentro de UPLOAD_DIR para la petición (ej. "proyectos/3/planos") */
  carpeta: (req: Request) => string;
  /** Devuelve un mensaje de error si el archivo no está permitido */
  validar: (file: Express.Multer.File, ext: string) => string | null;
}

/**
 * Crea un middleware que recibe un archivo opcional en el campo "archivo" (multipart/form-data).
 * Si la petición termina con error (validación, permisos, BD...), borra el archivo ya guardado
 * para no dejar archivos huérfanos en disco.
 * Para migrar a S3/Cloudinary: reemplazar el diskStorage (p. ej. multer-s3) y el StorageProvider.
 */
function crearUpload({ carpeta, validar }: UploadOptions): RequestHandler {
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
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
      const error = validar(file, path.extname(file.originalname).toLowerCase());
      if (error) return cb(AppError.badRequest(error));
      cb(null, true);
    },
  }).single('archivo');

  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400 && req.file?.path) fs.rm(req.file.path, { force: true }, () => {});
    });
    handler(req, res, next);
  };
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
