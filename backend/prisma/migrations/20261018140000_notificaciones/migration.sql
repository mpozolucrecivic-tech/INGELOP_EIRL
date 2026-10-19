-- Notificaciones dentro de la intranet. No modifica datos existentes.

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT,
    "enlace" TEXT,
    "clave" TEXT,
    "leidaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notificacion_clave_key" ON "Notificacion"("clave");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_leidaEn_creadoEn_idx" ON "Notificacion"("usuarioId", "leidaEn", "creadoEn");

-- CreateIndex
CREATE INDEX "Notificacion_creadoEn_idx" ON "Notificacion"("creadoEn");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

