-- Fila de aprovação de mensagens: pós-venda, aniversário e reativação ficam
-- aqui até a Maria liberar. Aviso de pedido novo/pronto não passa por aqui.
DO $$ BEGIN
  CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "wa_outbox" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "clientId"  TEXT,
  "phone"     TEXT NOT NULL,
  "content"   TEXT NOT NULL,
  "msgType"   TEXT NOT NULL,
  "status"    "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "error"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"    TIMESTAMP(3),
  CONSTRAINT "wa_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "wa_outbox_userId_status_idx" ON "wa_outbox"("userId", "status");

ALTER TABLE "wa_outbox"
  DROP CONSTRAINT IF EXISTS "wa_outbox_clientId_fkey";
ALTER TABLE "wa_outbox"
  ADD CONSTRAINT "wa_outbox_clientId_fkey" FOREIGN KEY ("clientId")
  REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
