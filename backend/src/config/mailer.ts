import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';

export interface Correo {
  para: string | string[];
  asunto: string;
  texto: string;
  html?: string;
  responderA?: string;
}

/** true si hay SMTP configurado; sin él, enviarCorreo no hace nada */
export const correoHabilitado = !!env.SMTP_HOST;

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter {
  transporte ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = TLS directo; 587 = STARTTLS
    requireTLS: env.SMTP_PORT !== 465 && env.NODE_ENV === 'production',
    ...(env.SMTP_USER && { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    // El contenido nunca debe leer archivos o URLs del servidor
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transporte;
}

/**
 * Envía un correo. Devuelve false si el correo no está configurado.
 * Lanza el error del servidor SMTP: quien no deba fallar por un correo usa enviarEnSegundoPlano.
 */
export async function enviarCorreo({ para, asunto, texto, html, responderA }: Correo): Promise<boolean> {
  if (!correoHabilitado) return false;
  await obtenerTransporte().sendMail({ from: env.SMTP_FROM ?? env.SMTP_USER, to: para, subject: asunto, text: texto, html, replyTo: responderA });
  return true;
}

/** Envía sin esperar ni interrumpir la petición: un fallo del correo solo queda en el log */
export function enviarEnSegundoPlano(correo: Correo, contexto: string) {
  enviarCorreo(correo).catch((e: unknown) =>
    console.error(`[CORREO] No se pudo enviar (${contexto}):`, e instanceof Error ? e.message : e),
  );
}

/** Escapa texto del usuario antes de insertarlo en el HTML de un correo */
export const escaparHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
