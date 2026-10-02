-- CreateEnum
CREATE TYPE "TipoMensaje" AS ENUM ('CONTACTO', 'CONSULTA_TECNICA');

-- CreateTable
CREATE TABLE "Servicio" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "slug" TEXT,
    "icono" TEXT,
    "items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "foto" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeContacto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT,
    "tipo" "TipoMensaje" NOT NULL DEFAULT 'CONTACTO',
    "entidad" TEXT,
    "servicioSlug" TEXT,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeContacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Servicio_slug_key" ON "Servicio"("slug");

-- CreateIndex
CREATE INDEX "Servicio_activo_orden_idx" ON "Servicio"("activo", "orden");

-- CreateIndex
CREATE INDEX "MensajeContacto_leido_fecha_idx" ON "MensajeContacto"("leido", "fecha");
