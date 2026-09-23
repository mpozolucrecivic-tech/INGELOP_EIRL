import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth';
import { validate } from '../../middlewares/validate';
import * as controller from './auth.controller';
import { loginSchema } from './auth.schema';

const router = Router();

// Único endpoint público de la API
router.post('/auth/login', validate({ body: loginSchema }), controller.login);
router.get('/auth/me', verifyToken, controller.me);

export default router;
