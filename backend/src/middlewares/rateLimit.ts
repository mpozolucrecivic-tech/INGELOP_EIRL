import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { marcar } from '../docs/marcas';
import { contextoDe, registrarEnSegundoPlano } from '../modules/auditoria/auditoria.service';

const ventanaMs = env.RATE_LIMIT_VENTANA_MIN * 60 * 1000;

/** Crea un limitador por IP que responde 429 con un mensaje en español */
const crearLimitador = (limit: number, message: string, modulo: 'auth' | 'contacto', skipSuccessfulRequests = false) =>
  rateLimit({
    windowMs: ventanaMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      registrarEnSegundoPlano({
        ...contextoDe(req),
        accion: modulo === 'auth' ? 'LOGIN_BLOQUEADO' : 'CONTACTO_BLOQUEADO',
        modulo, resultado: 'FALLO', codigoHttp: 429,
        correo: modulo === 'auth' && typeof req.body?.email === 'string' ? req.body.email : null,
        detalle: { motivo: 'límite de peticiones por IP' },
      });
      res.status(429).json({ message });
    },
  });

/** Formulario de contacto de la web: evita el spam */
export const limiteContacto = crearLimitador(
  env.RATE_LIMIT_CONTACTO,
  `Has enviado demasiados mensajes. Inténtalo de nuevo en ${env.RATE_LIMIT_VENTANA_MIN} minutos.`,
  'contacto',
);

/** Login: solo cuentan los intentos fallidos (fuerza bruta) */
export const limiteLogin = crearLimitador(
  env.RATE_LIMIT_LOGIN,
  `Demasiados intentos de inicio de sesión. Inténtalo de nuevo en ${env.RATE_LIMIT_VENTANA_MIN} minutos.`,
  'auth',
  true,
);

marcar(limiteContacto, { limite: `${env.RATE_LIMIT_CONTACTO} mensajes por IP cada ${env.RATE_LIMIT_VENTANA_MIN} min` });
marcar(limiteLogin, { limite: `${env.RATE_LIMIT_LOGIN} intentos fallidos por IP cada ${env.RATE_LIMIT_VENTANA_MIN} min; bloqueo por cuenta tras ${env.LOGIN_BLOQUEO_INTENTOS} fallos` });
