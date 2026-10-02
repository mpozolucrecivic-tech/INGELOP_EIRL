# INGELOP_EIRL

Sistema web de **INGELOP Consultores y Ejecutores E.I.R.L.** (RUC 20610231676, Chiclayo – Lambayeque), consultora de arquitectura e ingeniería habilitada en el RNP del OSCE como **consultor de obras**. Sus arquitectos e ingenieros elaboran **estudios, planos, expedientes técnicos y presupuestos de obra**, y supervisan su ejecución.

| Parte | Estado | Descripción |
|---|---|---|
| **Intranet – backend** (`backend/`) | ✅ | API REST: clientes, proyectos, planos con revisiones, presupuestos por partidas, entregables del expediente, equipo técnico y horas, tablero de tareas, gastos, documentos y dashboards. |
| **Intranet – frontend** (`frontend/`) | ✅ | Aplicación web que consume la API. |
| **Web informativa** (`web/`) | ✅ | Sitio público en **PHP**: inicio, nosotros, servicios, proyectos y contacto (formulario + WhatsApp). Ver [`web/README.md`](web/README.md). |

---

## Stack

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
| URL de la API para la **web** | `web/includes/api.php` (constante `API_URL`; o la variable de entorno `API_URL` del servidor) |
| URL de la API para la **intranet** | `VITE_API_URL` en `frontend/.env` (se fija al compilar con `npm run build`) |
| Dominios que pueden llamar a la API | `CORS_ORIGIN` en `backend/.env` |

**Servicios.** La web dibuja primero los 6 servicios fijos de `web/includes/config.php` y luego `assets/js/servicios.js` los reemplaza por los de la API (inicio, servicios, pie de página y el `<select>` de contacto), con el mismo HTML. Si la API no responde en 4 s, se quedan los fijos. Si un servicio tiene foto, se muestra en lugar del ícono (clase `.servicio-foto` en `assets/css/conexion-api.css`).

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
     `CORS_ORIGIN=https://ingelop.wuaze.com,https://<dominio-de-la-intranet>`
3. Una sola vez, desde la consola (Shell) de Render: `node dist/scripts/crearAdmin.js <correo> "<nombre>"` (con `ADMIN_PASSWORD`) y `node dist/scripts/cargarServicios.js`.
4. **Web:** en `web/includes/api.php`, cambia `http://localhost:4000/api/v1` por `https://<servicio>.onrender.com/api/v1`.
5. **Intranet:** compila con `VITE_API_URL=https://<servicio>.onrender.com/api/v1`.

> ⚠️ **Archivos en Render:** el disco del plan gratuito se borra en cada despliegue o reinicio, y con él las fotos de servicios y los documentos subidos. Para producción usa un *Persistent Disk* de Render montado en `UPLOAD_DIR`, o lleva los archivos a S3/Cloudinary implementando `StorageProvider` (`src/config/storage.ts`).
>
> ⚠️ **HTTPS:** si la web se abre por `https://`, la API también debe usar `https://`; si no, el navegador bloquea las peticiones. Render ya da HTTPS.
>
> En el plan gratuito, Render apaga la API tras 15 minutos sin uso y tarda unos 30 s en volver a responder. Mientras tanto la web muestra los servicios fijos, y el formulario se envía por PHP si pasan 8 s sin respuesta.

### Avisos por correo desde la API (pendiente)

Hoy, cuando un mensaje entra por la API, solo se ve en la intranet (**Mensajes de la web**). Para recibir además un correo:

1. `npm i nodemailer` y `npm i -D @types/nodemailer` en `backend/`.
2. Agrega a `backend/.env` y a `src/config/env.ts`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `CONTACTO_EMAIL` (opcionales: sin `SMTP_HOST` no se envía nada).
3. Crea `src/config/mailer.ts` con `nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })`.
4. En `contacto.service.ts`, después de `prisma.mensajeContacto.create(...)`, llama a `transport.sendMail({ from, to: CONTACTO_EMAIL, replyTo: correo, subject, text })` **sin `await`** y con `.catch(console.error)`. Así una falla del correo no hace perder el mensaje ni demora la respuesta.

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
| **Resumen general** | "Primeros pasos" (mientras falte algo), proyectos en desarrollo, monto contratado vs gastos, **planos esperando revisión**, **entregables vencidos**, horas trabajadas del mes, estado por proyecto | — |
| **Proyectos** | Todos, con búsqueda y filtros; crear | Solo los suyos |
| **Clientes** | Entidades públicas, empresas y personas (RUC/DNI, contacto) | — |
| **Personal y tarifas** | Profesionales con su costo por hora (no necesitan cuenta) | — |
| **Accesos a la intranet** | Cuentas para iniciar sesión | — |
| **Servicios** | Servicios de la web: orden, textos, foto, ocultar | — |
| **Mensajes** | Mensajes del formulario de la web (contador de no leídos en el menú) | — |
| **Ayuda** | Guías paso a paso | Solo las guías que le aplican |
| Proyecto → **Resumen** | Planos aprobados, entregables aprobados, plazo, horas, presupuestos, dinero del proyecto | Igual, sin dinero |
| Proyecto → **Planos** | Por especialidad; aprobar/observar, historial de revisiones | Registrar, subir revisiones, descargar |
| Proyecto → **Presupuestos** | Editor de partidas, versiones, aprobar/observar, Excel, PDF | Editar y enviar a revisión |
| Proyecto → **Entregables** | Checklist del expediente, plantilla, fechas límite | Solo lectura |
| Proyecto → **Tareas** | Tareas por periodo de trabajo (en la API: *sprints*), arrastrando tarjetas | Solo lectura |
| Proyecto → **Equipo y horas** | Asignar profesionales, registrar horas por tarea, horas trabajadas y costo | — |
| Proyecto → **Gastos** | Gastos del servicio frente al monto del contrato (margen) | — |
| Proyecto → **Documentos** | Galería de actas, informes, fotos y observaciones | Subir y ver |
| Proyecto → **Ajustes** | Editar el proyecto, dar/quitar acceso, eliminar | — |

## API (`/api/v1`)

Todo exige `Authorization: Bearer <token>`, salvo `POST /auth/login`, `GET /health` y las rutas de la web pública (`GET /servicios`, `GET /servicios/:id/foto`, `POST /contacto`).
**A** = solo ADMIN · **A/U** = ADMIN y USUARIO con acceso al proyecto.

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| **Auth** ||||
| POST | `/auth/login` | público | Login → `{ token, usuario }` |
| GET | `/auth/me` | A/U | Usuario autenticado |
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
| GET / PUT / DELETE | `/proyectos/:id` | A/U · A · A | Detalle / editar / eliminar (con archivos) |
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
| PUT / DELETE | `/gastos/:id` | A | |
| **Documentos** ||||
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
| GET | `/contacto` | A | Listar (`?tipo=&leido=&q=`) |
| PATCH | `/contacto/:id/leido` | A | `{ "leido": true }` |

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
| 429 | Demasiadas peticiones (formulario de contacto o intentos de login fallidos) |

## Decisiones de diseño

1. **Giro a consultoría** (migración `20260923120000_consultoria`): el cliente de texto pasó a la tabla `Cliente`, y `Proyecto.presupuesto` se renombró a `montoContrato` (honorarios). La asistencia de obra se convirtió en `RegistroHoras`. La migración **conserva los datos existentes**.
2. **Rubro de obra según el OSCE** (migración `20260923180000_rubro_obra`): cada proyecto indica una de las 5 especialidades de consultoría de obras en las que la empresa está inscrita en el RNP (edificaciones, saneamiento, viales, electromecánicas, represas e irrigaciones). También se agregaron los servicios *estudio de preinversión* y *liquidación de obra*, y las especialidades de plano *saneamiento* y *vialidad*.
3. **Un solo flujo de revisión** (`EstadoRevision`) para planos, presupuestos y entregables. Así la interfaz y los permisos son consistentes.
4. **Revisiones de planos inmutables:** cada archivo es una versión nueva (`PlanoVersion`) y nunca se sobrescribe. Queda el historial completo de quién subió qué y cuándo.
5. **Presupuestos versionados:** uno aprobado no se modifica. Para cambiarlo se duplica como nueva versión, que conserva las partidas.
6. **Costo de horas-hombre:** se calcula con el `costoHora` actual de cada profesional.
7. **Archivos protegidos:** planos y documentos solo se descargan con JWT y con acceso al proyecto; no hay carpeta pública. Para migrar a S3/Cloudinary hay que implementar `StorageProvider` (`src/config/storage.ts`).
8. `verifyToken` es stateless: un usuario desactivado conserva su token hasta que expire (máx. 8 h), aunque ya no puede volver a iniciar sesión.

## Próximos pasos

- Cargar en `web/includes/config.php` los proyectos reales, con fotos.
- Despliegue con HTTPS.
- Opcional: análisis de costos unitarios (ACU) por partida, cronograma de obra, notificaciones por correo al observar o aprobar, refresh tokens.
