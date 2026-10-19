# INGELOP_EIRL

Sistema web de **INGELOP Consultores y Ejecutores E.I.R.L.** (RUC 20610231676, Chiclayo – Lambayeque), consultora de arquitectura e ingeniería habilitada en el RNP del OSCE como **consultor de obras**. Sus arquitectos e ingenieros elaboran **estudios, planos, expedientes técnicos y presupuestos de obra**, y supervisan su ejecución.

| Parte | Estado | Descripción |
|---|---|---|
| **Intranet – backend** (`backend/`) | ✅ | API REST: clientes, proyectos, planos con revisiones, presupuestos por partidas, entregables del expediente, equipo técnico y horas, tablero de tareas, gastos, documentos y dashboards. |
| **Intranet – frontend** (`frontend/`) | ✅ | Aplicación web que consume la API. |
| **Web informativa** (`web/`) | ✅ | Sitio público en **PHP**: inicio, nosotros, servicios, proyectos y contacto (formulario + WhatsApp). Ver [`web/README.md`](web/README.md). |

---

## Stack

El sistema incluye un **CMS editorial** para páginas, marca y menú: editor por bloques, borradores separados de la publicación, vista previa temporal, historial con restauración, biblioteca de imágenes y permiso de editor. Activación y uso en [`docs/CMS.md`](docs/CMS.md). Las páginas originales siguen disponibles hasta publicar su versión editorial.

- **Backend:** Node.js · Express 5 · TypeScript · Prisma 6 · PostgreSQL 16 (Docker) · Zod · JWT + bcrypt · Multer
- **Frontend:** React 19 · Vite · TypeScript · Tailwind CSS 4 · TanStack Query · React Router 7 · React Hook Form + Zod · Recharts

## Estructura

```
INGELOP_EIRL/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # modelo de datos
│   │   ├── migrations/            # migraciones SQL versionadas
│   │   └── seed.ts                # admin + datos de prueba de una consultora
│   ├── src/
│   │   ├── config/                # env (validado con Zod), cors, prisma, storage
│   │   ├── middlewares/           # auth (verifyToken, requireRole), projectAccess, validate, upload, errorHandler
│   │   ├── modules/<modulo>/      # <modulo>.routes / .controller / .service / .schema
│   │   ├── types/express.d.ts     # tipa req.usuario
│   │   ├── utils/                 # AppError, access (filtros por rol), helpers, schemas comunes
│   │   ├── app.ts                 # Express + registro de rutas
│   │   └── server.ts
│   ├── http/api.http              # colección de peticiones (REST Client)
│   ├── scripts/e2e.ts             # prueba end-to-end de todos los endpoints
│   ├── uploads/                   # archivos (planos, documentos) — no versionado
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                   # cliente axios (token JWT) y hooks de TanStack Query por módulo
│   │   ├── components/            # ui/ (Button, Field, Modal…), layout/, gráficos
│   │   ├── context/AuthContext    # sesión: login, /auth/me, logout
│   │   ├── lib/format.ts          # soles, fechas, etiquetas en español
│   │   ├── pages/                 # Login, Resumen general, Proyectos, Clientes, Personal y tarifas, Accesos, Servicios, Mensajes, Ayuda
│   │   │   └── proyecto/          # pestañas del proyecto (ver tabla más abajo)
│   │   └── types/api.ts           # tipos de las respuestas de la API
│   └── vite.config.ts             # proxy /api -> http://localhost:4000
├── web/                           # sitio público en PHP (ver web/README.md)
├── deploy/                        # producción: docker-compose, Caddy (HTTPS), respaldos y guía
├── package.json                   # scripts para levantar todo junto
└── docker-compose.yml             # PostgreSQL + PHP/Apache para la web
```

## Levantar el proyecto en local

Requisitos: **Node.js 20+** y **Docker Desktop** abierto.

Los comandos funcionan igual en **PowerShell**, CMD o Git Bash. Ejecútalos uno por línea, desde la carpeta `INGELOP_EIRL`.

**Primera vez:**

```powershell
npm run install:all                 # instala dependencias de la raíz, backend y frontend
npm run db:up                       # PostgreSQL en Docker (localhost:5432)
copy backend\.env.example backend\.env
```

Abre `backend/.env` y cambia `JWT_SECRET` por una clave larga. Puedes generarla con:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

```powershell
cd backend
npx prisma migrate deploy           # crea las tablas
npm run db:seed                     # admin + datos de prueba
cd ..
```

**Día a día:**

```powershell
npm run db:up                       # si reiniciaste la PC
npm run dev                         # levanta API + web a la vez
```

- Intranet: **http://localhost:5173**
- API: http://localhost:4000/api/v1 (en desarrollo el frontend la usa a través del proxy de Vite)
- Web informativa: `docker compose up -d web` → **http://localhost:8080**

Para verificar la API, con el servidor corriendo, en otra terminal: `npm run test:e2e` (179 comprobaciones sobre todos los endpoints y permisos).

### Usuarios del seed

| Rol | Email | Contraseña | Acceso |
|---|---|---|---|
| ADMIN | `admin@ingelop.com` | valor de `SEED_ADMIN_PASSWORD` en `.env` | Todo |
| USUARIO | `residente@ingelop.com` | valor de `SEED_USUARIO_PASSWORD` en `.env` | "Expediente técnico: Mejoramiento de la I.E. N° 10125" |
| USUARIO | `supervisor@ingelop.com` | valor de `SEED_USUARIO_PASSWORD` en `.env` | "Diseño de vivienda multifamiliar de 5 pisos" |

El seed conserva los usuarios y **recrea** los datos de demo (clientes, proyectos, planos con PDFs de ejemplo, presupuestos, entregables, equipo y horas) en cada ejecución. Todos los datos de clientes son ficticios.

### Scripts

| Dónde | Script | Qué hace |
|---|---|---|
| raíz | `npm run dev` | Levanta backend y frontend juntos |
| raíz | `npm run build` | Compila backend y frontend |
| `backend/` | `npm run dev` / `npm run build` / `npm start` | Solo la API |
| `backend/` | `npm run prisma:deploy` | Aplica migraciones pendientes |
| `backend/` | `npm run prisma:studio` | Explorador visual de la BD |
| `backend/` | `npm run db:seed` | Datos de demo |
| `backend/` | `npm run db:reset` | Borra la BD, reaplica migraciones y ejecuta el seed |
| `backend/` | `npm run test:e2e` | Prueba end-to-end (requiere la API corriendo) |
| `backend/` | `npx tsx src/scripts/cargarServicios.ts` | Crea los 6 servicios de la web si faltan, sin tocar nada más (en producción: `node dist/scripts/cargarServicios.js`) |
| `backend/` | `npx tsx src/scripts/cargarSitio.ts` | Crea los datos de contacto de la web que falten, **vacíos y ocultos** (en producción: `node dist/scripts/cargarSitio.js`) |
| `backend/` | `npx tsx src/scripts/verificarAuditoria.ts` | Comprueba que nadie alteró la auditoría (cadena de huellas) |
| `backend/` | `npx tsx src/scripts/purgarAuditoria.ts` | Borra registros de auditoría más antiguos que `AUDITORIA_RETENCION_DIAS` |
| raíz | `powershell -ExecutionPolicy Bypass -File deploy
espaldo.ps1` | Copia de seguridad de la base de datos y los archivos (ver `docs/ALMACENAMIENTO_Y_RESPALDOS.md`) |

### Variables de entorno (`backend/.env`)

| Variable | Ejemplo | Descripción |
|---|---|---|
| `DATABASE_URL` | `postgresql://ingelop:dev123@localhost:5432/ingelop` | Conexión PostgreSQL |
| `JWT_SECRET` | *(≥ 32 caracteres)* | Clave de firma de los JWT. **Obligatoria**; el servidor no arranca sin ella |
| `JWT_EXPIRES_IN` | `8h` | Vigencia del token |
| `PORT` | `4000` | Puerto de la API |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:8080` | Orígenes permitidos (intranet y web), separados por coma y sin `/` final |
| `TRUST_PROXY` | `0` | `1` si la API está detrás de un proxy (Render, Caddy). Sin esto, el límite de peticiones vería a todos con la misma IP |
| `RATE_LIMIT_VENTANA_MIN` | `15` | Ventana del límite de peticiones, en minutos |
| `RATE_LIMIT_CONTACTO` | `5` | Mensajes de contacto por IP en esa ventana |
| `RATE_LIMIT_LOGIN` | `10` | Intentos de login **fallidos** por IP en esa ventana |
| `UPLOAD_DIR` | `uploads` | Carpeta de archivos |
| `MAX_UPLOAD_MB` | `50` | Tamaño máximo por archivo (los planos DWG pueden pesar bastante) |
| `MAX_FOTO_MB` | `5` | Tamaño máximo de la foto de un servicio (JPG, PNG o WEBP) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | | Credenciales del admin que crea el seed |
| `SEED_USUARIO_PASSWORD` | | Contraseña de los usuarios de demostración del seed |
| `LOGIN_BLOQUEO_INTENTOS` / `LOGIN_BLOQUEO_MIN` | `5` / `15` | Bloqueo por cuenta: fallos seguidos y minutos de bloqueo |
| `AUDITORIA_RETENCION_DIAS` | `730` | Conservación de la auditoría (mínimo 730 = 2 años, Ley 29733) |
| `STORAGE_DRIVER` | `local` | `local` (disco, `UPLOAD_DIR`) o `s3` (Cloudflare R2). Con `s3` son obligatorias `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (`S3_REGION=auto`) |
| `SWAGGER_HABILITADO` | `false` | Publica `/api/docs` en producción. En desarrollo la documentación siempre está disponible |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | `smtp.gmail.com` / `587` | Correo saliente (opcional). Sin `SMTP_HOST` no se envía ningún correo. `SMTP_FROM` es el remitente; sin ella se usa `SMTP_USER` |
| `CONTACTO_EMAIL` | `contacto@ingelop.pe` | Bandeja que recibe el aviso de cada mensaje nuevo de la web |
| `INTRANET_URL` | `http://localhost:5173` | Dirección de la intranet para los enlaces de los correos. La recuperación de contraseña por correo necesita esta variable y `SMTP_HOST` |

---

## Despliegue en producción

Todo (web, intranet, API y base de datos) se publica en **un solo VPS con Docker**, con HTTPS automático (Caddy + Let's Encrypt) y respaldos diarios. La guía paso a paso está en [`deploy/DESPLIEGUE.md`](deploy/DESPLIEGUE.md).

```bash
cp deploy/.env.example deploy/.env      # dominios y secretos
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

En producción el seed de demostración está **bloqueado**. El primer administrador se crea con `node dist/scripts/crearAdmin.js` (ver la guía).

---

## Conexión web ↔ API ↔ intranet

```
Web PHP (ingelop.wuaze.com) ──fetch──► API /api/v1 ◄──axios── Intranet React
   GET /servicios, POST /contacto          │          (gestiona servicios y lee mensajes)
                                       PostgreSQL
```

| Qué | Dónde se configura |
|---|---|
| URL de la API para la **web** | `web/includes/api.php` (constante `API_URL`; o la variable de entorno `API_URL` del servidor). `API_URL_SERVIDOR` solo hace falta en Docker |
| URL de la API para la **intranet** | `VITE_API_URL` en `frontend/.env` (se fija al compilar con `npm run build`) |
| Dominios que pueden llamar a la API | `CORS_ORIGIN` en `backend/.env` |

**Servicios.** El PHP renderiza los servicios de `GET /web` directamente en inicio, servicios, pie de página y selector de contacto, incluidas sus fotos. Una lista vacía muestra cero servicios. Si la API falla, se usa la última copia válida (sin vencimiento); si no hay copia, se muestran los servicios fijos de `config.php`, para que la web nunca se vea vacía.

**Datos de la empresa y proyectos realizados.** Se editan en la intranet (**Página web → Datos de la empresa / Proyectos realizados**). Cada dato de contacto tiene **Publicar en la web**: lo oculto queda guardado, pero la API no lo entrega. El PHP pide `GET /web` **antes de enviar la página** (máximo 3 s) y guarda la última respuesta buena en `web/storage/cache/web.json` (bloqueada al navegador y fuera de Git). Si la API no responde, usa esa copia y no vuelve a intentarlo durante 60 s, para que la página cargue rápido aunque Render esté "dormido".

**Contacto.** `assets/js/contacto.js` envía el formulario a `POST /contacto` y muestra el aviso de éxito o los errores por campo. Si la API no responde (sin conexión, más de 8 s o error 5xx), el formulario se envía por PHP como antes: correo con `mail()` y copia en `web/storage/mensajes.csv` (carpeta bloqueada al público). Sin JavaScript también funciona por PHP.

### Probar en local

1. `npm run db:up` y `npm run dev` (API en `:4000`, intranet en `:5173`).
2. `docker compose up -d web` → web en **http://localhost:8080**.
3. En `backend/.env`: `CORS_ORIGIN="http://localhost:5173,http://localhost:8080"`.
4. Si la base de datos es nueva: `npm run db:seed`, o solo `npx tsx src/scripts/cargarServicios.ts` para no tocar los demás datos.

### Publicar el backend en Render + Neon (temporal)

1. **Neon:** crea la base de datos y copia la cadena de conexión (con `?sslmode=require`) en `DATABASE_URL`.
2. **Render (Web Service)**, carpeta raíz `backend/`:
   - Build: `npm ci --include=dev && npx prisma generate && npm run build` (`--include=dev` porque TypeScript es dependencia de desarrollo)
   - Start: `npx prisma migrate deploy && npm start`
   - Variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `TRUST_PROXY=1`,
     `CORS_ORIGIN=https://ingelop.wuaze.com,https://<dominio-de-la-intranet>`,
     `CMS_WEB_URL=https://ingelop.wuaze.com` (obligatoria: canonical, sitemap y enlaces de vista previa)
   - **Archivos en Cloudflare R2** (obligatorio en Render): `STORAGE_DRIVER=s3` y `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Paso a paso en [`docs/ALMACENAMIENTO_Y_RESPALDOS.md`](docs/ALMACENAMIENTO_Y_RESPALDOS.md)
3. Variables de seguridad: `TRUST_PROXY=1` y, tras el primer despliegue, **verifica la IP real** como indica [`docs/AUDITORIA.md`](docs/AUDITORIA.md#ip-real-detrás-de-un-proxy-render-caddy).
4. Una sola vez, desde la consola (Shell) de Render: `node dist/scripts/crearAdmin.js <correo> "<nombre>"` (con `ADMIN_PASSWORD`), `node dist/scripts/cargarServicios.js` y `node dist/scripts/cargarSitio.js`.
5. **Web:** en `web/includes/api.php`, cambia `http://localhost:4000/api/v1` por `https://<servicio>.onrender.com/api/v1`. Sube también `storage/.htaccess` y comprueba que `https://<tu-web>/storage/cache/web.json` responda **403** (prohibido).
6. **Intranet:** compila con `VITE_API_URL=https://<servicio>.onrender.com/api/v1` y `VITE_WEB_URL=https://ingelop.wuaze.com` (enlace a la política de privacidad en el login).
7. **Política de privacidad:** `web/privacidad.php` es un borrador técnico; la empresa debe revisarlo antes de publicarlo.

> ⚠️ **Archivos en Render:** el disco del plan gratuito se borra en cada despliegue o reinicio. Por eso en Render los archivos van a **Cloudflare R2** (`STORAGE_DRIVER=s3`); sin eso se perderían los planos, documentos y fotos.
>
> **Copias de seguridad** de Neon + R2: `deploy/respaldo.ps1` (con Docker, programable en el Programador de tareas de Windows) e instrucciones para restaurar en [`docs/ALMACENAMIENTO_Y_RESPALDOS.md`](docs/ALMACENAMIENTO_Y_RESPALDOS.md).
>
> ⚠️ **HTTPS:** si la web se abre por `https://`, la API también debe usar `https://`; si no, el navegador bloquea las peticiones. Render ya da HTTPS.
>
> En el plan gratuito, Render apaga la API tras 15 minutos sin uso y tarda unos 30 s en volver a responder. Mientras tanto la web muestra los servicios fijos, y el formulario se envía por PHP si pasan 8 s sin respuesta.

### Mejoras futuras de la web

- **Textos principales editables** (frase de portada, "Quiénes somos", forma de trabajo): hoy están escritos en cada `.php`.
- **Especialidades OSCE editables** (`ESPECIALIDADES_OSCE` en `web/includes/config.php`).
- Leer también los **servicios** desde el servidor PHP (hoy los pide el navegador), con la misma copia de respaldo.

### Avisos por correo y seguimiento de mensajes

Con `SMTP_HOST` y `CONTACTO_EMAIL` definidos, cada mensaje que entra por la API se envía también por correo a `CONTACTO_EMAIL`. Al pulsar **Responder** en ese correo, la respuesta va directo a quien escribió. El envío ocurre después de guardar el mensaje y sin esperar: si el servidor de correo falla, el mensaje no se pierde, el visitante no nota nada y el error queda en el log (`[CORREO]`). Sin `SMTP_HOST` no se envía nada.

En **Mensajes de la web** cada mensaje tiene un estado: **Por atender** → **Respondido** → **Archivado**. Además tiene una **nota interna** (solo la ve la jefatura) y se puede **eliminar**. Archivar lo saca de la bandeja sin borrarlo.

Para probar el correo en local sin una cuenta real: `docker run -d --rm --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit`, con `SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_FROM="INGELOP <no-responder@ingelop.test>"` y `CONTACTO_EMAIL=bandeja@ingelop.test`. Los correos se ven en http://localhost:8025.

## Auditoría y seguridad de accesos

La intranet registra inicios de sesión (correctos, fallidos y bloqueados), accesos denegados, credenciales alteradas y **toda** creación, edición, eliminación, subida y descarga, con fecha, persona, **IP**, navegador y registro afectado. Los registros no se pueden editar ni borrar (trigger de PostgreSQL + cadena de huellas verificable). Incluye bloqueo por cuenta tras 5 fallos, alertas de seguridad (IP sospechosas, accesos desde una IP o navegador nuevo) y el último acceso de cada usuario. Cada persona cambia su contraseña en **Mi cuenta** o la recupera con un enlace por correo (un solo uso, 30 min); al cambiarla, o cuando la jefatura le asigna una nueva, se cierran sus sesiones abiertas. Detalle, conservación legal y cómo verificar la IP real en Render: [`docs/AUDITORIA.md`](docs/AUDITORIA.md).

## Notificaciones

La campana de la barra superior muestra avisos para cada persona (se revisa cada minuto):

| Aviso | Quién lo recibe |
|---|---|
| Plano, presupuesto o etapa enviado a revisión | Jefatura |
| Plano aprobado u observado (con el comentario) | Su responsable y quien subió la última revisión |
| Presupuesto o etapa aprobados u observados | Responsable del proyecto y usuarios con acceso |
| Te dieron acceso a un proyecto | Esa persona |
| Entregable que vence en 3 días o ya venció (sin aprobar, proyecto no finalizado) | Su responsable, o la jefatura si no tiene |
| Carta fianza vigente que vence en 15 días o ya venció | Jefatura |
| Observación de la entidad registrada o reasignada | Su responsable, o el equipo del proyecto si no tiene |
| Observación sin levantar que vence en 2 días o ya venció | Su responsable (o el equipo) y la jefatura |
| Ampliación de plazo aprobada | Responsable del proyecto y usuarios con acceso |
| Factura emitida hace más de 30 días sin cobrar, o cobro programado cuya fecha pasó sin facturar | Jefatura |

Nadie recibe aviso de su propia acción. Los avisos se crean en segundo plano: si fallan, la acción original no se ve afectada. Los recordatorios de entregables y la limpieza de avisos con más de 90 días corren como máximo una vez por hora, al consultar la campana; no hace falta una tarea programada. Al eliminar un proyecto se borran sus avisos. Marcar como leída no se registra en la auditoría.

## Roles

- **ADMIN** (gerencia/coordinación): acceso total. Es quien **aprueba u observa** planos y presupuestos, gestiona entregables, clientes, equipo, horas y gastos.
- **USUARIO** (arquitectos, ingenieros): ve solo los proyectos donde tiene acceso (**Ajustes → Usuarios con acceso**). En esos proyectos puede:
  - registrar planos y **subir revisiones** (cada revisión nueva queda "En revisión");
  - crear y editar **presupuestos** y enviarlos a revisión. No puede aprobarlos, y un presupuesto aprobado no se edita: se crea una nueva versión;
  - subir documentos (actas, informes, fotos de visitas);
  - consultar entregables, tablero y resumen. Todo eso es de solo lectura.

## Flujo de revisión (planos, presupuestos y entregables)

```
BORRADOR ──► EN REVISIÓN ──► APROBADO
                  │
                  └──► OBSERVADO ──(nueva revisión / corrección)──► EN REVISIÓN
```

- **Planos:** sin archivo quedan en *Borrador*. Al subir un archivo se crea la **Rev. A** (luego B, C…) y el plano pasa a *En revisión*. El ADMIN lo aprueba o lo observa con un comentario. Las descargas se llaman `CÓDIGO_RevX.ext` (ej. `E-01_RevB.pdf`). Formatos: PDF, DWG, DXF, RVT, IFC, SKP, imágenes y ZIP.
- **Presupuestos:** hoja de partidas con ítems jerárquicos (`01`, `01.01`, `01.01.02`). Parcial = metrado × P.U. Cada título suma sus partidas. Totales: **costo directo → gastos generales (%) → utilidad (%) → subtotal → IGV (%) → total**. Se exporta a Excel (CSV) y se imprime o guarda como PDF.
- **Entregables:** con un clic se carga la plantilla del expediente técnico (memoria descriptiva, estudios, planos por especialidad, especificaciones técnicas, metrados, ACU, presupuesto, fórmula polinómica, cronograma y panel fotográfico). Los entregables no aprobados con fecha límite pasada se marcan como **vencidos**.

## Frontend: pantallas

En pantalla los roles se llaman **Jefatura** (`ADMIN`) y **Arquitecto o ingeniero** (`USUARIO`). El menú se agrupa en *Trabajo*, *Personas* y *Página web*.

| Pantalla | ADMIN | USUARIO |
|---|---|---|
| **Resumen general** | "Primeros pasos" (mientras falte algo), proyectos en desarrollo, monto contratado vs gastos de obra, gastos de la empresa, **planos esperando revisión**, **entregables vencidos**, horas trabajadas del mes, estado por proyecto, gasto mensual (obras y oficina) | — |
| **Proyectos** | Todos, con búsqueda y filtros; crear; **Ver archivados** | Solo los suyos (nunca los archivados) |
| **Documentos** | Todos los documentos de todos los proyectos, con filtros (proyecto, etapa, categoría, persona, fechas); descargar y eliminar | — |
| **Mis documentos** | — | Historial de lo que subió |
| **Clientes** | Municipalidades, gobiernos regionales, empresas privadas y personas (RUC/DNI, contacto) | — |
| **Cobranzas** | Cobros pendientes de todos los proyectos (facturados sin cobrar, programados), lo cobrado en el año (neto y detracciones) y cartas fianza vigentes por vencimiento | — |
| **Gastos de la empresa** | Gastos que no son de una obra (alquiler, servicios, sueldos, licencias, impuestos, útiles); **importar desde Excel** con columna *Obra* opcional | — |
| **Personal y tarifas** | Profesionales con su costo por hora (no necesitan cuenta) | — |
| **Accesos a la intranet** | Cuentas para iniciar sesión, con el último acceso (fecha e IP) | — |
| **Auditoría** | Alertas de seguridad, registro de actividad con filtros, detalle y exportación CSV | — |
| **Datos de la empresa** | Teléfono, WhatsApp, correo, dirección, horario y redes, cada uno con *Publicar en la web* | — |
| **Servicios** | Servicios de la web: orden, textos, foto, ocultar | — |
| **Proyectos realizados** | Portafolio de la web: orden, datos, foto, ocultar | — |
| **Mensajes** | Mensajes del formulario de la web (contador de no leídos en el menú): por atender, respondidos y archivados, con nota interna; aviso por correo si hay SMTP | — |
| **Ayuda** | Guías paso a paso | Solo las guías que le aplican |
| **Mi cuenta** (clic en el nombre, abajo en el menú) | Sus datos y cambiar su contraseña | Igual |
| Proyecto → **Resumen** | Planos aprobados, entregables aprobados, plazo, horas, presupuestos, dinero del proyecto | Igual, sin dinero |
| Proyecto → **Etapas y documentos** | Iniciar etapas, aprobar u observar con comentario; ver y eliminar todos los documentos | Ver el estado de cada etapa, enviar o reenviar a revisión, subir documentos y ver **solo los suyos** |
| Proyecto → **Planos** | Por especialidad; aprobar/observar, historial de revisiones | Registrar, subir revisiones, descargar |
| Proyecto → **Presupuestos** | Editor de partidas, versiones, aprobar/observar, Excel, PDF | Editar y enviar a revisión |
| Proyecto → **Entregables** | Checklist del expediente, plantilla, fechas límite | Solo lectura |
| Proyecto → **Tareas** | Tareas por periodo de trabajo (en la API: *sprints*), arrastrando tarjetas | Solo lectura |
| Proyecto → **Equipo y horas** | Asignar profesionales, registrar horas por tarea, horas trabajadas y costo | — |
| Proyecto → **Cobros y garantías** | Pagos pactados con el cliente (programado → facturado → cobrado) con detracción, penalidad y neto recibido frente al contrato; cartas fianza con renovación | — |
| Proyecto → **Contrato** → Observaciones de la entidad | Registrar con documento, plazo y responsable; levantar con la carta de respuesta | Ver; marcar «en proceso» y redactar la respuesta |
| Proyecto → **Contrato** → Correspondencia | Cartas y oficios enviados/recibidos con su archivo, número sugerido y a qué responden | Ver y descargar |
| Proyecto → **Contrato** → Plazo y penalidades | Plazo original y vigente, ampliaciones (aprobar corre la fecha de término) y calculadora de penalidad por mora | Ver plazo y ampliaciones |
| Proyecto → **Gastos** | Gastos del servicio frente al monto del contrato (margen); **importar desde Excel** y deshacer importaciones | — |
| Proyecto → **Fotos y observaciones** | Galería de actas, informes, fotos y observaciones (evidencias) | Subir y ver |
| Proyecto → **Configuración** | Editar el proyecto, dar/quitar acceso, **archivar o reactivar**, eliminar (solo si está archivado) | — |

## Documentación interactiva (Swagger)

Con la API en marcha: **<http://localhost:4000/api/docs>**. Lista los 171 endpoints agrupados por módulo, con quién puede usarlos (rol, acceso al proyecto, límites) y los campos que acepta cada uno. Se genera leyendo las rutas reales de Express y los mismos esquemas Zod que validan las peticiones, así que no se desactualiza.

Para probar rutas protegidas: ejecuta `POST /api/v1/auth/login`, copia el `token`, pulsa **Authorize** y pégalo. En producción está apagada salvo que se defina `SWAGGER_HABILITADO=true` (expone todas las rutas de la API).

## API (`/api/v1`)

Todo exige `Authorization: Bearer <token>`, salvo `POST /auth/login`, la recuperación de contraseña, `GET /health` y las rutas de la web pública (`GET /servicios`, `GET /servicios/:id/foto`, `POST /contacto`).
**A** = solo ADMIN · **A/U** = ADMIN y USUARIO con acceso al proyecto.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| **Auth** ||||
| POST | `/auth/login` | público | Login → `{ token, usuario }` |
| GET | `/auth/me` | A/U | Usuario autenticado |
| POST | `/auth/cambiar-contrasena` | A/U | `{ actual, nueva }` → `{ token }` nuevo; las demás sesiones del usuario dejan de valer. Límite: `RATE_LIMIT_LOGIN` fallos por IP |
| GET | `/auth/opciones` | público | `{ recuperacionContrasena }`: si hay correo configurado para recuperar la contraseña |
| POST | `/auth/recuperar-contrasena` | público | `{ email }` → siempre la misma respuesta, exista o no la cuenta. Envía un enlace de un solo uso que vence en 30 min (uno cada 2 min por cuenta). 503 si no hay correo configurado. Límite: `RATE_LIMIT_CONTACTO` por IP |
| POST | `/auth/restablecer-contrasena` | público | `{ token, nueva }` con el código del enlace (`/restablecer-contrasena#<token>`). 400 si el enlace no existe, venció o ya se usó |
| **Usuarios** ||||
| GET / POST | `/usuarios` | A | Listar (`?rol=&activo=`) / crear |
| PUT / DELETE | `/usuarios/:id` | A | Editar / baja lógica |
| **Clientes** ||||
| GET / POST | `/clientes` | A | Listar (`?q=&activo=`) / crear (RUC 11 o DNI 8 dígitos, único) |
| GET / PUT | `/clientes/:id` | A | Detalle con proyectos / editar o desactivar |
| DELETE | `/clientes/:id` | A | Solo si no tiene proyectos (si tiene → 409; desactivarlo) |
| **Proyectos** ||||
| GET | `/proyectos?estado=&clienteId=&rubro=&q=` | A/U | ADMIN: todos · USUARIO: los suyos |
| POST | `/proyectos` | A | `{ nombre, clienteId, tipoServicio, rubro, ubicacion, fechaInicio, fechaFin, montoContrato, estado, responsableId }` |
| GET / PUT / DELETE | `/proyectos/:id` | A/U · A · A | Detalle / editar / eliminar con archivos (**solo si está archivado**; si no, 409) |
| POST | `/proyectos/:id/archivar` · `/proyectos/:id/desarchivar` | A | Archivado: fuera de `GET /proyectos` (salvo `?archivados=true`), del inicio y de los recordatorios de entregables; los usuarios asignados reciben 403. Los cobros y cartas fianza siguen en Cobranzas |
| GET / POST / DELETE | `/proyectos/:id/usuarios[/:usuarioId]` | A | Acceso de usuarios al proyecto |
| **Planos** ||||
| GET | `/proyectos/:id/planos?especialidad=&estado=` | A/U | Con última revisión |
| POST | `/proyectos/:id/planos` | A/U | multipart: `codigo, titulo, especialidad, responsableId?, comentario?, archivo?` |
| GET | `/planos/:id` | A/U | Con historial de revisiones |
| POST | `/planos/:id/versiones` | A/U | multipart: `archivo, comentario?` → nueva revisión, pasa a EN_REVISION |
| PATCH | `/planos/:id` | A | Editar / aprobar / observar (`observacion` obligatoria al observar) |
| DELETE | `/planos/:id` | A | Elimina plano y archivos |
| GET | `/planos/versiones/:id/archivo?ver=true` | A/U | Descarga (o vista en el navegador) |
| **Presupuestos** ||||
| GET / POST | `/proyectos/:id/presupuestos` | A/U | Listar con totales / crear |
| GET / PUT | `/presupuestos/:id` | A/U | Detalle con partidas y totales / cabecera y estado |
| PUT | `/presupuestos/:id/partidas` | A/U | Reemplaza todas las partidas (409 si está aprobado) |
| POST | `/presupuestos/:id/duplicar` | A/U | Nueva versión en BORRADOR |
| DELETE | `/presupuestos/:id` | A | Eliminar |
| **Entregables** ||||
| GET | `/proyectos/:id/entregables` | A/U | Con indicador `vencido` |
| POST | `/proyectos/:id/entregables` | A | Crear |
| POST | `/proyectos/:id/entregables/plantilla` | A | Agrega los 14 entregables estándar que falten |
| PATCH / DELETE | `/entregables/:id` | A | Editar/estado (al aprobar registra la fecha de entrega) / eliminar |
| **Equipo técnico y horas** ||||
| GET / POST / PUT | `/trabajadores[/:id]` | A | Profesionales (DNI, cargo, costo/hora) |
| GET / POST | `/proyectos/:id/asignaciones` | A | Equipo del proyecto |
| PATCH | `/asignaciones/:id` | A | Retirar (`fechaFin`) |
| GET / POST | `/proyectos/:id/registros-horas` | A | Registro de horas por tarea (asignación vigente; máx. 24 h/día sumando proyectos) |
| DELETE | `/registros-horas/:id` | A | Eliminar registro |
| GET | `/proyectos/:id/horas?desde=&hasta=` | A/U | Horas-hombre y costo por profesional |
| **Tablero** ||||
| GET / POST | `/proyectos/:id/sprints` | A/U · A | Sprints |
| PUT / DELETE | `/sprints/:id` | A | |
| GET / POST | `/sprints/:id/actividades?vista=kanban` | A/U · A | Actividades |
| PATCH / DELETE | `/actividades/:id` | A | Mover en el tablero / eliminar |
| **Gastos** ||||
| GET / POST | `/proyectos/:id/gastos` | A | Gastos del servicio |
| GET | `/proyectos/:id/gastos/resumen` | A/U | Frente al monto del contrato (margen), por categoría y por mes |
| PUT / DELETE | `/gastos/:id` | A | La categoría debe corresponder al tipo de gasto (obra o empresa) |
| GET / POST | `/gastos/empresa` | A | Gastos de la empresa (sin proyecto) |
| GET | `/gastos/empresa/resumen` | A | Total, por categoría y por mes (`?desde&hasta`) |
| POST | `/gastos/importar/verificar` | A | Marca filas que parecen repetidas (ya existen o se repiten en el archivo) |
| POST | `/gastos/importar` | A | Importa hasta 1000 filas en una transacción (todo o nada); cada error indica la fila del Excel |
| GET | `/gastos/importaciones` | A | Historial (`?proyectoId`; sin él, las de la empresa) |
| DELETE | `/gastos/importaciones/:id` | A | Deshace la importación: borra sus gastos |
| **Etapas** (orden: preinversión → expediente técnico → supervisión → liquidación) ||||
| GET | `/proyectos/:id/etapas` | A/U | Etapas y su estado (todos los asignados las ven) |
| POST | `/proyectos/:id/etapas` | A | Iniciar etapa (`tipo`, `fechaInicio?`, `fechaFin?`). La primera es libre; la siguiente exige la anterior **aprobada**; nunca hacia atrás |
| PATCH | `/etapas/:id` | A | Fechas |
| POST | `/etapas/:id/enviar` | A/U | En elaboración u observada → en revisión |
| POST | `/etapas/:id/aprobar` | A | Aprobar (ya no admite documentos nuevos) |
| POST | `/etapas/:id/observar` | A | Observar con `observacion` obligatoria; no se reabre si ya existe una etapa posterior |
| DELETE | `/etapas/:id` | A | Solo la última y sin documentos |
| **Documentos de las etapas** ||||
| GET | `/proyectos/:id/documentos` | A/U | Jefatura: todos. Arquitecto o ingeniero: **solo los que subió** (`?etapaId=&categoria=`) |
| POST | `/proyectos/:id/etapas/:etapaId/documentos` | A/U | multipart: `archivo`, `categoria` (MEMORIA, PLANOS, METRADOS, PRESUPUESTO, CRONOGRAMA, INFORME), `descripcion?`. PDF, Word, Excel, imágenes, DWG, DXF o ZIP; se verifica la firma real del archivo |
| GET | `/documentos` | A | Todos, con filtros `proyectoId, etapa, categoria, usuarioId, desde, hasta, q` y paginación |
| GET | `/documentos/mios` | A/U | Historial propio |
| GET | `/documentos/:id/archivo` | A/U | Descarga (dueño o jefatura); `?ver=true` para abrir en el navegador |
| PATCH | `/documentos/:id` | A/U | Categoría o descripción (dueño o jefatura) |
| DELETE | `/documentos/:id` | A | El archivo pasa a una papelera: si falla la BD vuelve a su lugar; si no, se borra |
| **Fotos y observaciones (evidencias)** ||||
| GET / POST | `/proyectos/:id/evidencias` | A/U | Documentos, fotos y observaciones (multipart) |
| GET | `/evidencias/:id/archivo` | A/U | Archivo protegido |
| DELETE | `/evidencias/:id` | A | |
| **Dashboard** ||||
| GET | `/proyectos/:id/dashboard` | A/U | KPIs del proyecto |
| GET | `/dashboard/general?meses=12` | A | KPIs de la consultora |
| **Web pública: servicios** ||||
| GET | `/servicios` | público | Servicios activos ordenados por `orden`. `fotoUrl` es relativa a la URL de la API |
| GET | `/servicios/:id/foto` | público | Foto del servicio (solo si está activo) |
| GET | `/servicios/todos` | A | Todos, incluidos los ocultos |
| POST | `/servicios` | A | Crear (`nombre`, `descripcion`, `slug?`, `icono?`, `items?`, `orden?`, `activo?`) |
| PUT / DELETE | `/servicios/:id` | A | Editar / ocultar (baja lógica) |
| POST / DELETE | `/servicios/:id/foto` | A | Subir foto (multipart, campo `archivo`; JPG, PNG o WEBP, máx. `MAX_FOTO_MB`) / quitarla |
| **Web pública: contacto** ||||
| POST | `/contacto` | público | Guarda el mensaje (`nombre`, `correo`, `telefono?`, `tipo`: `CONTACTO` o `CONSULTA_TECNICA`, `entidad?`, `servicio?` = slug, `mensaje`). Límite: `RATE_LIMIT_CONTACTO` por IP |
| GET | `/contacto` | A | Listar (`?tipo=&leido=&estado=&q=`; `estado`: `NUEVO`, `RESPONDIDO`, `ARCHIVADO` o `PENDIENTES` = todo lo no archivado) |
| PATCH | `/contacto/:id/leido` | A | `{ "leido": true }` |
| PATCH | `/contacto/:id` | A | `{ estado?, nota? }`. Al pasar a `RESPONDIDO` guarda `respondidoEn`; volver a `NUEVO` la borra; `nota: ""` borra la nota |
| DELETE | `/contacto/:id` | A | Elimina el mensaje (para sacarlo de la bandeja sin borrarlo, archívalo) |
| **Web pública: datos y portafolio** ||||
| GET | `/web` | público | `{ datos, proyectos }`: solo los datos **publicados** y los proyectos realizados activos. Lo lee el PHP de la web |
| GET / PUT | `/sitio` | A | Los 8 datos de contacto con su estado / guardar `{ datos: [{ clave, valor, publicado }] }` (claves fijas, validación por tipo; no se publica un dato vacío) |
| GET / POST | `/portafolio` | A | Proyectos realizados (todos) / crear (`titulo`, `cliente?`, `ubicacion?`, `anio?`, `servicio?`) |
| PUT / DELETE | `/portafolio/:id` | A | Editar / ocultar (baja lógica) |
| POST / DELETE | `/portafolio/:id/foto` | A | Subir foto (JPG, PNG o WEBP) / quitarla |
| GET | `/portafolio/:id/foto` | público | Foto (solo si el proyecto está visible) |
| **Cobros y cartas fianza** (solo jefatura) ||||
| GET | `/proyectos/:id/cobros` | A | `{ resumen, cobros }`: contrato, programado, facturado, cobrado, por cobrar, por facturar, sin programar, neto recibido, detracciones y penalidades |
| POST | `/proyectos/:id/cobros` | A | `concepto, monto` (con IGV), `detraccion?, penalidad?, fechaProgramada?, comprobante?, fechaEmision?, fechaCobro?, estado?, observacion?`. Facturado o cobrado exige comprobante y emisión; cobrado exige fecha de pago |
| PUT / DELETE | `/cobros/:id` | A | Editar (al volver de cobrado se borra la fecha de pago) / eliminar |
| GET | `/cobros` | A | Toda la empresa (`?estado=` `PENDIENTES` = programados y facturados, `?proyectoId=`) con resumen: por cobrar, facturas de más de 30 días, cobrado en el año |
| GET / POST | `/proyectos/:id/cartas-fianza` | A | Cartas del proyecto (con `diasParaVencer`) / registrar (`numero, entidadFinanciera, monto, fechaEmision, fechaVencimiento, tipo?`) |
| GET | `/cartas-fianza` | A | Todas (`?estado=&proyectoId=`), ordenadas por vencimiento |
| PUT / DELETE | `/cartas-fianza/:id` | A | Editar o marcar devuelta/ejecutada / eliminar (si era una renovación, la anterior vuelve a vigente) |
| POST | `/cartas-fianza/:id/renovar` | A | La vigente pasa a RENOVADA y se crea la nueva enlazada (`numero, fechaEmision, fechaVencimiento, monto?, entidadFinanciera?`) |
| **Contrato: observaciones, correspondencia y plazo** ||||
| GET | `/proyectos/:id/observaciones` | A/U | `{ resumen, observaciones }` (`?estado=` o `ABIERTAS`), con `diasParaVencer` |
| POST | `/proyectos/:id/observaciones` | A | `documento, fechaRecepcion, descripcion, fechaLimite?, responsableId?, etapaId?, estado?, respuesta?, correspondenciaId?` (correlativo por proyecto) |
| PATCH / DELETE | `/observaciones/:id` | A/U · A | Jefatura: todo. Arquitecto o ingeniero: solo `estado` (pendiente o en proceso) y `respuesta`, mientras esté abierta. Al levantarla se guarda la fecha de respuesta |
| GET / POST | `/proyectos/:id/correspondencia` | A/U · A | Listar (`?tipo=&q=`) / registrar (multipart: `tipo, numero, fecha, asunto, entidad, referencia?, respondeAId?, archivo?`; se verifica la firma real del archivo) |
| GET | `/correspondencia/siguiente-numero` | A | Correlativo sugerido de cartas enviadas del año (`NNN-AAAA`) |
| GET | `/correspondencia/:id/archivo` | A/U | Descarga (`?ver=true` para abrir) |
| PUT / DELETE | `/correspondencia/:id` | A | Editar datos / eliminar con su archivo |
| GET / POST | `/proyectos/:id/ampliaciones` | A/U · A | `{ plazo, ampliaciones }` (plazo original y vigente, días restantes) / solicitar (`motivo, diasSolicitados, fechaSolicitud`) |
| PUT / DELETE | `/ampliaciones/:id` | A | Editar (solo solicitada) / eliminar (si estaba aprobada, la fecha de término vuelve atrás) |
| POST | `/ampliaciones/:id/resolver` | A | `{ estado: APROBADA \| DENEGADA, diasAprobados?, fechaResolucion, documentoResolucion? }`; aprobar suma los días a la fecha de término del proyecto |
| **Notificaciones** (cada usuario, las suyas) ||||
| GET | `/notificaciones` | A/U | `{ noLeidas, notificaciones }` (`?soloNoLeidas=true&limite=30`, máx. 100) |
| GET | `/notificaciones/contador` | A/U | `{ noLeidas }` |
| POST | `/notificaciones/:id/leer` | A/U | Marca una como leída (404 si no es tuya) |
| POST | `/notificaciones/leer-todas` | A/U | `{ marcadas }` |
| **Auditoría** ||||
| GET | `/auditoria` | A | Registros (`?desde=&hasta=&usuarioId=&modulo=&accion=&resultado=&ip=&pagina=&porPagina=`) |
| GET | `/auditoria/exportar` | A | Los mismos filtros en CSV (máx. 10 000 filas) |
| GET | `/auditoria/alertas` | A | Fallos, bloqueos, accesos denegados y credenciales alteradas (24 h); IP sospechosas; accesos nuevos (7 días) |
| GET | `/auditoria/ultimos-accesos` | A | Último inicio de sesión de cada usuario (fecha e IP) |

> **Materiales (oculto):** los endpoints `/proyectos/:id/materiales` y `/materiales/:id/movimientos` siguen en la API, pero no aparecen en la interfaz ni en los dashboards, porque INGELOP no maneja almacén. Si más adelante ejecutan obras, basta con volver a mostrar la pestaña (`frontend/src/pages/proyecto/MaterialesTab.tsx`).

### Convenciones

- **JSON:** montos, metrados y horas se envían como **number**. Las fechas van en ISO 8601; para enviarlas basta `YYYY-MM-DD`.
- **Errores:** `{ "message": "..." }`. Las validaciones agregan `errors: [{ campo, mensaje }]`.

| Código | Cuándo |
|---|---|
| 400 | Regla de negocio simple (archivo faltante o no permitido, ítem repetido), JSON mal formado |
| 401 | Sin token, token inválido o expirado, credenciales incorrectas |
| 403 | Rol sin permiso, o USUARIO sin acceso al proyecto |
| 404 | Recurso o ruta inexistente |
| 409 | Conflicto: duplicados (email, RUC, DNI, código de plano), presupuesto aprobado, horas > 24 en el día, cliente con proyectos… |
| 413 | Archivo demasiado grande |
| 422 | Error de validación en body/params/query |
| 429 | Demasiadas peticiones (formulario de contacto o intentos de login fallidos) o cuenta bloqueada temporalmente |

## Decisiones de diseño

1. **Giro a consultoría** (migración `20260923120000_consultoria`): el cliente de texto pasó a la tabla `Cliente`, y `Proyecto.presupuesto` se renombró a `montoContrato` (honorarios). La asistencia de obra se convirtió en `RegistroHoras`. La migración **conserva los datos existentes**.
2. **Rubro de obra según el OSCE** (migración `20260923180000_rubro_obra`): cada proyecto indica una de las 5 especialidades de consultoría de obras en las que la empresa está inscrita en el RNP (edificaciones, saneamiento, viales, electromecánicas, represas e irrigaciones). También se agregaron los servicios *estudio de preinversión* y *liquidación de obra*, y las especialidades de plano *saneamiento* y *vialidad*.
3. **Un solo flujo de revisión** (`EstadoRevision`) para planos, presupuestos y entregables. Así la interfaz y los permisos son consistentes.
4. **Revisiones de planos inmutables:** cada archivo es una versión nueva (`PlanoVersion`) y nunca se sobrescribe. Queda el historial completo de quién subió qué y cuándo.
5. **Presupuestos versionados:** uno aprobado no se modifica. Para cambiarlo se duplica como nueva versión, que conserva las partidas.
6. **Costo de horas-hombre:** se calcula con el `costoHora` actual de cada profesional.
7. **Archivos protegidos:** planos y documentos solo se descargan con JWT y con acceso al proyecto; no hay carpeta pública. Para migrar a S3/Cloudinary hay que implementar `StorageProvider` (`src/config/storage.ts`).
8. `verifyToken` valida la firma y consulta el usuario en cada petición: desactivar una cuenta o cambiarle el rol retira sus permisos inmediatamente. Las vistas previas usan tokens con un propósito distinto y no sirven para autenticarse en la intranet.

## Próximos pasos

- Cargar los proyectos reales, con fotos, desde la intranet (Página web → Proyectos realizados).
- Despliegue con HTTPS.
- Opcional: análisis de costos unitarios (ACU) por partida, cronograma de obra, notificaciones por correo al observar o aprobar, refresh tokens.
