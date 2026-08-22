-- Arquivar cliente em vez de excluir: some das listas e das mensagens
-- automáticas, mas o histórico (pedidos, recibos, conversas) fica intacto.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "clients_userId_archivedAt_idx" ON "clients"("userId", "archivedAt");
