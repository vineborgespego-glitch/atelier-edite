-- Marca que o pós-venda automático já foi enviado para este pedido (envia uma vez só).
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "postSaleSentAt" TIMESTAMP(3);
