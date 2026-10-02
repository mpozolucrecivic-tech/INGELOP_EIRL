import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth';
import { limiteLogin } from '../../middlewares/rateLimit';
import { validate } from '../../middlewares/validate';
import * as controller from './auth.controller';
import { loginSchema } from './auth.schema';

const router = Router();

// Público, con límite de intentos fallidos por IP
router.post('/auth/login', limiteLogin, validate({ body: loginSchema }), controller.login);
router.get('/auth/me', verifyToken, controller.me);

export default router;
