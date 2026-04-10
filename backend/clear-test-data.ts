import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearData() {
  console.log("Conectando ao banco de dados...");
  
  try {
    console.log("Limpando itens de pedidos...");
    await prisma.orderItem.deleteMany();
    
    console.log("Limpando notificações...");
    await prisma.notification.deleteMany();
    
    console.log("Limpando recibos...");
    await prisma.receipt.deleteMany();
    
    console.log("Limpando pedidos...");
    await prisma.order.deleteMany();
    
    console.log("Limpando clientes...");
    await prisma.client.deleteMany();
    
    console.log("Limpando cupons...");
    await prisma.coupon.deleteMany();

    console.log("✅ Dados de teste limpos com sucesso! O banco de dados está pronto para o uso oficial.");
  } catch (error) {
    console.error("❌ Erro ao limpar os dados:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearData();
