-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accion" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "registroId" TEXT,
    "resultado" TEXT NOT NULL,
    "codigoHttp" INTEGER,
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT,
    "correo" TEXT,
    "ip" TEXT,
    "cadenaIp" TEXT,
    "navegador" TEXT,
    "metodo" TEXT,
    "ruta" TEXT,
    "idPeticion" TEXT,
    "detalle" JSONB,
    "hashAnterior" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auditoria_hash_key" ON "Auditoria"("hash");

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_fecha_idx" ON "Auditoria"("usuarioId", "fecha");

-- CreateIndex
CREATE INDEX "Auditoria_accion_fecha_idx" ON "Auditoria"("accion", "fecha");

-- CreateIndex
CREATE INDEX "Auditoria_modulo_fecha_idx" ON "Auditoria"("modulo", "fecha");

-- CreateIndex
CREATE INDEX "Auditoria_ip_fecha_idx" ON "Auditoria"("ip", "fecha");

-- CreateIndex
CREATE INDEX "Auditoria_correo_accion_fecha_idx" ON "Auditoria"("correo", "accion", "fecha");

-- La auditoría solo admite INSERT. UPDATE, DELETE y TRUNCATE se rechazan, excepto la purga por
-- antigüedad (scripts/purgarAuditoria), que activa ingelop.purga_auditoria solo dentro de su transacción.
CREATE OR REPLACE FUNCTION auditoria_inmutable() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('ingelop.purga_auditoria', true) = 'si' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'La auditoría no se puede modificar ni borrar (operación %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Auditoria_inmutable"
  BEFORE UPDATE OR DELETE ON "Auditoria"
  FOR EACH ROW EXECUTE FUNCTION auditoria_inmutable();

CREATE TRIGGER "Auditoria_sin_truncate"
  BEFORE TRUNCATE ON "Auditoria"
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_inmutable();
