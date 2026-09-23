import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types/api';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';
const TOKEN_KEY = 'ingelop.token';

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* almacenamiento no disponible */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
  },
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Se ejecuta cuando la API responde 401 (token vencido o inválido) */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorBody>) => {
    const esLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !esLogin) onUnauthorized?.();
    return Promise.reject(error);
  },
);

/** Mensaje legible de un error de la API (incluye el detalle de validación si existe) */
export function mensajeError(error: unknown, porDefecto = 'Ocurrió un error inesperado'): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (!error.response) return 'No se pudo conectar con el servidor';
    if (body?.errors?.length) return body.errors.map((e) => `${e.campo.replace(/^body\./, '')}: ${e.mensaje}`).join(' · ');
    if (body?.message) return body.message;
  }
  return porDefecto;
}

/** Descarga un archivo protegido y devuelve un blob URL (para <img> o descargas) */
export async function obtenerArchivo(url: string): Promise<string> {
  const ruta = url.startsWith(API_URL) ? url.slice(API_URL.length) : url.replace(/^\/api\/v1/, '');
  const res = await api.get<Blob>(ruta, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}
