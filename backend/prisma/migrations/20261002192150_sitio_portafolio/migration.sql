-- CreateTable
CREATE TABLE "DatoSitio" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL DEFAULT '',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatoSitio_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "ProyectoWeb" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente" TEXT,
    "ubicacion" TEXT,
    "anio" INTEGER,
    "servicio" TEXT,
    "foto" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoWeb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProyectoWeb_activo_orden_idx" ON "ProyectoWeb"("activo", "orden");
