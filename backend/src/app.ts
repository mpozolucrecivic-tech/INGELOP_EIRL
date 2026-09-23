import express, { Router } from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { verifyToken } from './middlewares/auth';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import usuariosRoutes from './modules/usuarios/usuarios.routes';
import proyectosRoutes from './modules/proyectos/proyectos.routes';
import sprintsRoutes from './modules/sprints/sprints.routes';
import actividadesRoutes from './modules/actividades/actividades.routes';
import materialesRoutes from './modules/materiales/materiales.routes';
import personalRoutes from './modules/personal/personal.routes';
import gastosRoutes from './modules/gastos/gastos.routes';
import evidenciasRoutes from './modules/evidencias/evidencias.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import clientesRoutes from './modules/clientes/clientes.routes';
import planosRoutes from './modules/planos/planos.routes';
import presupuestosRoutes from './modules/presupuestos/presupuestos.routes';
import entregablesRoutes from './modules/entregables/entregables.routes';

export const app = express();

app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Healthcheck (sin datos, sin autenticación)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = Router();

// 1) Rutas públicas: solo POST /auth/login (GET /auth/me aplica verifyToken en su propio router)
api.use(authRoutes);

// 2) A partir de aquí TODAS las rutas exigen JWT válido
api.use(verifyToken);
api.use(usuariosRoutes);
api.use(clientesRoutes);
api.use(proyectosRoutes);
api.use(sprintsRoutes);
api.use(actividadesRoutes);
api.use(materialesRoutes); // oculto en la interfaz (INGELOP no maneja almacén); se conserva por si ejecutan obras
api.use(planosRoutes);
api.use(presupuestosRoutes);
api.use(entregablesRoutes);
api.use(personalRoutes);
api.use(gastosRoutes);
api.use(evidenciasRoutes);
api.use(dashboardRoutes);

app.use('/api/v1', api);

app.use(notFoundHandler);
app.use(errorHandler);
