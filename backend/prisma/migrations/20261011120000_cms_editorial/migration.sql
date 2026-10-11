ALTER TABLE "Usuario" ADD COLUMN "puedeEditarWeb" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "DocumentoCms" (
  "clave" TEXT PRIMARY KEY, "borrador" JSONB NOT NULL, "publicado" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1, "publicadoEn" TIMESTAMP(3), "actualizadoEn" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "RevisionCms" (
  "id" SERIAL PRIMARY KEY, "documentoClave" TEXT NOT NULL REFERENCES "DocumentoCms"("clave") ON DELETE CASCADE ON UPDATE CASCADE,
  "contenido" JSONB NOT NULL, "accion" TEXT NOT NULL, "autorId" INTEGER NOT NULL,
  "autorNombre" TEXT NOT NULL, "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "RevisionCms_documentoClave_fecha_idx" ON "RevisionCms"("documentoClave", "fecha");
CREATE TABLE "MedioCms" (
  "id" SERIAL PRIMARY KEY, "archivo" TEXT NOT NULL UNIQUE, "nombre" TEXT NOT NULL,
  "textoAlternativo" TEXT NOT NULL DEFAULT '', "tamano" INTEGER NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
