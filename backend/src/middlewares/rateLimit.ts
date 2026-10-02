import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const ventanaMs = env.RATE_LIMIT_VENTANA_MIN * 60 * 1000;

/** Crea un limitador por IP que responde 429 con un mensaje en español */
const crearLimitador = (limit: number, message: string, skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: ventanaMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ message });
    },
  });

/** Formulario de contacto de la web: evita el spam */
export const limiteContacto = crearLimitador(
  env.RATE_LIMIT_CONTACTO,
  `Has enviado demasiados mensajes. Inténtalo de nuevo en ${env.RATE_LIMIT_VENTANA_MIN} minutos.`,
);

/** Login: solo cuentan los intentos fallidos (fuerza bruta) */
export const limiteLogin = crearLimitador(
  env.RATE_LIMIT_LOGIN,
  `Demasiados intentos de inicio de sesión. Inténtalo de nuevo en ${env.RATE_LIMIT_VENTANA_MIN} minutos.`,
  true,
);
