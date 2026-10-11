# Auditoría y seguridad de accesos

La intranet registra quién hizo qué, cuándo y desde dónde. Los registros **no se pueden editar ni borrar** desde la aplicación ni directamente en la base de datos (salvo la purga por antigüedad). Se consultan en **Personas → Auditoría** (solo jefatura).

## Qué se registra

| Evento | Cuándo |
|---|---|
| `LOGIN_OK` | Inicio de sesión correcto. Marca `ipNueva` / `navegadorNuevo` si la persona nunca había entrado desde esa IP o ese navegador |
| `LOGIN_FALLIDO` | Contraseña incorrecta, correo inexistente o cuenta desactivada (el motivo solo queda en la auditoría; la persona ve un mensaje genérico) |
| `LOGIN_BLOQUEADO` | Bloqueo por cuenta (5 fallos seguidos) o por IP (límite de peticiones) |
| `TOKEN_ALTERADO` | Credencial con firma inválida, manipulada o de otro propósito (p. ej. un enlace de vista previa usado como sesión). Los tokens simplemente vencidos **no** se registran |
| `SESION_RECHAZADA` | Token válido de una cuenta ya desactivada o eliminada |
| `ACCESO_DENEGADO` | Cualquier respuesta 403: alguien intentó entrar donde no tiene permiso |
| `CREAR`, `EDITAR`, `ELIMINAR`, `SUBIR` | Toda modificación de la intranet, en todos los módulos (se registra automáticamente) |
| `DESCARGAR` | Descarga de archivos protegidos (planos, documentos) |
| `PUBLICAR`, `RETIRAR`, `RESTAURAR`, `VISTA_PREVIA` | Acciones del CMS |
| `CAMBIO_PERMISOS` | Alta de usuarios y cambios de rol, estado (activo) o permiso de editor web, con el **antes y el después** |
| `CONTACTO_BLOQUEADO` | El formulario de la web superó el límite anti-spam |
| `CONSULTA_AUDITORIA` | Alguien consultó o exportó la auditoría |
| `PURGA_AUDITORIA` | Se borraron registros más antiguos que el plazo de conservación |

Cada registro guarda: fecha y hora, persona, acción, módulo y registro afectado, resultado y código HTTP, **IP**, cadena completa de IP (`X-Forwarded-For` + IP del socket), navegador, operación (`PUT /planos/:id`) e identificador de petición (`X-Request-Id`). En `detalle` solo se guardan **nombres** de campos modificados, nunca sus valores.

**Nunca se guardan** contraseñas, tokens ni la URL real de la petición (se guarda la plantilla, con los números como `:id`). Los textos se limpian de saltos de línea para evitar inyección en los registros (guía de logging de OWASP).

## Protección de los registros

1. **Solo inserción.** Un trigger de PostgreSQL rechaza `UPDATE`, `DELETE` y `TRUNCATE` sobre la tabla `Auditoria`. La API no tiene ninguna ruta para editarla o borrarla.
2. **Cadena de huellas (hash).** Cada registro guarda la huella SHA-256 de su contenido y la del registro anterior. Si alguien con acceso total a la base desactiva el trigger y altera, borra o inserta filas, la cadena se rompe:

   ```powershell
   cd backend
   npx tsx src/scripts/verificarAuditoria.ts      # producción: node dist/scripts/verificarAuditoria.js
   ```

   Responde `✅ Auditoría íntegra` o lista los registros alterados (y sale con código 1). Conviene ejecutarlo periódicamente y después de cualquier incidente.
3. **Acceso restringido.** Solo la jefatura consulta la auditoría, y cada consulta queda registrada.

## Bloqueo de cuentas

Además del límite por IP (`RATE_LIMIT_LOGIN`), tras **5 intentos fallidos seguidos** con un mismo correo, ese correo queda bloqueado **15 minutos** (`LOGIN_BLOQUEO_INTENTOS`, `LOGIN_BLOQUEO_MIN`). Esto frena a quien prueba contraseñas contra una cuenta desde muchas IP. Se bloquean también correos inexistentes, para no revelar cuáles existen. El bloqueo se levanta solo al cumplirse el plazo; un inicio de sesión correcto reinicia el conteo.

## Conservación (Ley N.° 29733)

El Reglamento de la Ley de Protección de Datos Personales (D.S. N.° 016-2024-JUS, art. 46, según resúmenes especializados; confirmar en el texto oficial) exige conservar los registros de acceso **al menos 2 años**. `AUDITORIA_RETENCION_DIAS` (mínimo 730) define el plazo; la API no arranca con un valor menor.

Purga de lo más antiguo, por ejemplo una vez al mes (deja constancia en la propia auditoría):

```bash
node dist/scripts/purgarAuditoria.js
# En el VPS, con cron:  0 3 1 * * docker compose -f /opt/ingelop/deploy/docker-compose.prod.yml --env-file /opt/ingelop/deploy/.env exec -T api node dist/scripts/purgarAuditoria.js
```

La IP y el navegador son datos personales: la web informa de este registro en `privacidad.php` y la intranet en la pantalla de inicio de sesión.

## IP real detrás de un proxy (Render, Caddy)

La IP que se muestra es `req.ip` de Express, que depende de `TRUST_PROXY`:

- **Local:** `TRUST_PROXY=0` (no hay proxy). Una cabecera `X-Forwarded-For` enviada por el cliente se ignora.
- **Render / Caddy:** `TRUST_PROXY=1` (un proxy delante).

Sobre Render hay reportes contradictorios: algunos usuarios indican que su proxy **no borra** un `X-Forwarded-For` enviado por el cliente (podría falsificarse la IP si se confía en la primera de la lista), y personal de Render indica que la primera IP es la real. Por eso se guarda también la **cadena completa**. **En el primer despliegue, compruébalo:**

1. Desde tu PC, inicia sesión normalmente en la intranet publicada.
2. Haz un intento de login con una cabecera falsa:

   ```powershell
   curl.exe -X POST https://<tu-api>.onrender.com/api/v1/auth/login -H "Content-Type: application/json" -H "X-Forwarded-For: 6.6.6.6" -d '{\"email\":\"prueba@ejemplo.com\",\"password\":\"x\"}'
   ```

3. En **Auditoría**, abre ese intento: la **IP** debe ser la de tu conexión (compárala con https://ifconfig.me), **no** `6.6.6.6`. La **cadena de IP** muestra lo que recibió el servidor.
4. Si la IP mostrada es `6.6.6.6`, el proxy está pasando la cabecera del cliente: avisa para ajustar `TRUST_PROXY` según la cadena observada.

## Qué no incluye (a propósito)

- **Ubicación geográfica de la IP:** requeriría enviar las IP del personal a un servicio externo (otro tratamiento y otra transferencia de datos personales). Se puede consultar manualmente una IP sospechosa cuando haga falta.
- **Alertas por correo:** la API aún no tiene SMTP (ver "Avisos por correo desde la API" en el README). Las alertas se ven en la tarjeta **Alertas de seguridad**.
