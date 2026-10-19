-- Seguimiento de los mensajes de la web: estado, nota interna y fecha de respuesta.
-- No modifica datos existentes: todos los mensajes actuales quedan como NUEVO.

-- CreateEnum
CREATE TYPE "EstadoMensaje" AS ENUM ('NUEVO', 'RESPONDIDO', 'ARCHIVADO');

-- AlterTable
ALTER TABLE "MensajeContacto" ADD COLUMN     "estado" "EstadoMensaje" NOT NULL DEFAULT 'NUEVO',
ADD COLUMN     "nota" TEXT,
ADD COLUMN     "respondidoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MensajeContacto_estado_fecha_idx" ON "MensajeContacto"("estado", "fecha");
