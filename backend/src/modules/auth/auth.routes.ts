import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth';
import { limiteCambioContrasena, limiteLogin, limiteRecuperacion, limiteRestablecer } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import * as controller from './auth.controller';
import { cambiarContrasenaSchema, loginSchema, restablecerContrasenaSchema, solicitarRecuperacionSchema } from './auth.schema';

const router = Router();

// Público, con límite de intentos fallidos por IP
router.post('/auth/login', limiteLogin, validate({ body: loginSchema }), controller.login);
router.get('/auth/opciones', controller.opciones);
router.post('/auth/recuperar-contrasena', limiteRecuperacion, validate({ body: solicitarRecuperacionSchema }), controller.solicitarRecuperacion);
router.post('/auth/restablecer-contrasena', limiteRestablecer, validate({ body: restablecerContrasenaSchema }), controller.restablecerContrasena);

router.get('/auth/me', verifyToken, controller.me);
router.post('/auth/cambiar-contrasena', verifyToken, limiteCambioContrasena, validate({ body: cambiarContrasenaSchema }), controller.cambiarContrasena);

export default router;
