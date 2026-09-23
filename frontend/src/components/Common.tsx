import { useEffect, useState } from 'react';
import { FileText, ImageOff } from 'lucide-react';
import { obtenerArchivo } from '@/api/client';
import { ESTADO_PROYECTO } from '@/lib/format';
import type { EstadoProyecto } from '@/types/api';
import { Badge } from './ui/Display';

export function EstadoProyectoBadge({ estado }: { estado: EstadoProyecto }) {
  const e = ESTADO_PROYECTO[estado];
  return <Badge color={e.color}>{e.label}</Badge>;
}

/**
 * Imagen servida por un endpoint protegido con JWT: la descarga con el token
 * y la muestra como blob URL (un <img src> normal no envía el header Authorization).
 */
export function AuthImage({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelado = false;
    obtenerArchivo(url)
      .then((u) => {
        blobUrl = u;
        if (!cancelado) setSrc(u);
      })
      .catch(() => !cancelado && setError(true));
    return () => {
      cancelado = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className ?? ''}`}>
        <ImageOff className="size-6" />
      </div>
    );
  }
  if (!src) return <div className={`animate-pulse bg-slate-100 ${className ?? ''}`} />;
  return <img src={src} alt={alt} className={className} />;
}

/** Abre un archivo protegido en una pestaña nueva (PDF, documentos) */
export async function abrirArchivo(url: string) {
  const ventana = window.open('', '_blank');
  const blobUrl = await obtenerArchivo(url);
  if (ventana) ventana.location.href = blobUrl;
  else window.location.href = blobUrl;
}

export function IconoArchivo() {
  return <FileText className="size-8 text-slate-400" />;
}
