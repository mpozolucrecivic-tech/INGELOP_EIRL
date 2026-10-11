import express, { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { verifyToken } from './middlewares/auth';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { auditarPeticion, idPeticion } from './middlewares/auditoria';
import auditoriaRoutes from './modules/auditoria/auditoria.routes';
import { generarOpenApi } from './docs/openapi';
import etapasRoutes from './modules/etapas/etapas.routes';
import documentosRoutes from './modules/documentos/documentos.routes';
import { env } from './config/env';

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
import serviciosRoutes, { serviciosPublicRoutes } from './modules/servicios/servicios.routes';
import contactoRoutes, { contactoPublicRoutes } from './modules/contacto/contacto.routes';
import sitioRoutes, { sitioPublicRoutes } from './modules/sitio/sitio.routes';
import portafolioRoutes, { portafolioPublicRoutes } from './modules/portafolio/portafolio.routes';
import cmsRoutes, { cmsPublicRoutes } from './modules/cms/cms.routes';

export const app = express();

app.disable('x-powered-by');
// En Render o detrás de Caddy: req.ip toma la IP real del visitante (límite de peticiones)
app.set('trust proxy', env.TRUST_PROXY);
app.use(cors({ ...corsOptions, exposedHeaders: [...((corsOptions.exposedHeaders as string[]) ?? []), 'X-Request-Id'] }));
app.use(idPeticion);
app.use(express.json({ limit: '1mb' }));

// Healthcheck (sin datos, sin autenticación)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const api = Router();

// 1) Rutas públicas: POST /auth/login (GET /auth/me aplica verifyToken en su propio router)
//    y las que usa la web informativa: GET /servicios, GET /servicios/:id/foto, POST /contacto,
//    GET /web (datos publicados + proyectos realizados) y GET /portafolio/:id/foto
api.use(authRoutes);
api.use(serviciosPublicRoutes);
api.use(contactoPublicRoutes);
api.use(sitioPublicRoutes);
api.use(portafolioPublicRoutes);
api.use(cmsPublicRoutes);

// 2) A partir de aquí TODAS las rutas exigen JWT válido
api.use(verifyToken);
// Registra en la auditoría todas las modificaciones, descargas y accesos denegados de la intranet
api.use(auditarPeticion);
api.use(auditoriaRoutes);
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
api.use(etapasRoutes);
api.use(documentosRoutes);
api.use(dashboardRoutes);
api.use(serviciosRoutes);
api.use(contactoRoutes);
api.use(sitioRoutes);
api.use(portafolioRoutes);
api.use(cmsRoutes);

app.use('/api/v1', api);

// Documentación Swagger: en desarrollo siempre; en producción solo con SWAGGER_HABILITADO=true
// (muestra todas las rutas de la API, así que por defecto no se publica)
if (env.NODE_ENV !== 'production' || env.SWAGGER_HABILITADO) {
  app.get('/api/docs.json', (req, res) => {
    res.json(generarOpenApi(req.app));
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: 'API INGELOP',
      swaggerOptions: { url: '/api/docs.json', persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha' },
    }),
  );
}

app.use(notFoundHandler);
app.use(errorHandler);
