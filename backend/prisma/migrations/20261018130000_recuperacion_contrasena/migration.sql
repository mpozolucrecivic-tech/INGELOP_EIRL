-- Cambio y recuperación de contraseña: fecha del último cambio (invalida sesiones anteriores)
-- y enlaces de recuperación de un solo uso. No modifica datos existentes.

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "contrasenaCambiadaEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RecuperacionContrasena" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecuperacionContrasena_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecuperacionContrasena_tokenHash_key" ON "RecuperacionContrasena"("tokenHash");

-- CreateIndex
CREATE INDEX "RecuperacionContrasena_usuarioId_creadoEn_idx" ON "RecuperacionContrasena"("usuarioId", "creadoEn");

-- AddForeignKey
ALTER TABLE "RecuperacionContrasena" ADD CONSTRAINT "RecuperacionContrasena_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

