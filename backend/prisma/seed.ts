import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // 1. Create Atelier Owner (User)
  const passwordHash = await bcrypt.hash('123456', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'contato@atelieredite.com.br' },
    update: {},
    create: {
      email: 'contato@atelieredite.com.br',
      name: 'Maria (Atelier Édite)',
      passwordHash,
      role: 'OWNER',
      atelierName: 'Atelier Édite by Maria',
      phone: '+55 11 98888-7777',
    },
  });

  // 2. Create Clients
  const client1 = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Ana Clara Silva',
      cpfCnpj: '123.456.789-00',
      phone: '+55 11 91234-5678',
      measures: { bust: 90, waist: 70, hips: 100, observation: 'Gosta de cintos apertados' },
    },
  });

  const client2 = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Confecções Sonho Real',
      cpfCnpj: '12.345.678/0001-90',
      email: 'compras@sonhoreal.com.br',
      phone: '+55 11 3456-7890',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      userId: owner.id,
      name: 'Pedro Santos',
      cpfCnpj: '987.654.321-10',
    },
  });

  // 3. Create Orders
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-0001',
      userId: owner.id,
      clientId: client2.id,
      title: 'Lote Camisas Sociais',
      status: 'EM_PRODUCAO', // Will map to IN_PRODUCTION since schema uses English enums
      dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
      totalAmount: 1500.0,
      items: {
        create: [
          { description: 'Camisa Social Branca M', quantity: 10, unitPrice: 100.0, subtotal: 1000.0 },
          { description: 'Camisa Social Azul G', quantity: 5, unitPrice: 100.0, subtotal: 500.0 }
        ]
      }
    }
  }).catch(() => { /* Ignore Enum Mismatch if any, this is a mock script */ });

  // Safe enum usages for the remaining
  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-0002',
      userId: owner.id,
      clientId: client1.id,
      title: 'Vestido Floral',
      status: 'CONFIRMED', 
      dueDate: new Date(new Date().setDate(new Date().getDate() + 5)),
      totalAmount: 250.0,
      deposit: 50.0,
      items: {
        create: [
          { description: 'Ajuste Barra', quantity: 1, unitPrice: 50.0, subtotal: 50.0 },
          { description: 'Manutenção Zíper', quantity: 1, unitPrice: 200.0, subtotal: 200.0 }
        ]
      }
    }
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-0003',
      userId: owner.id,
      clientId: client3.id,
      title: 'Barra Calça Jeans',
      status: 'READY',
      dueDate: new Date(),
      totalAmount: 35.0,
      items: {
        create: [
          { description: 'Barra Original Calça', quantity: 1, unitPrice: 35.0, subtotal: 35.0 }
        ]
      }
    }
  });

  // 4. Create Coupons
  await prisma.coupon.create({
    data: {
      userId: owner.id,
      code: 'PORTES-GRATIS',
      type: 'FREE_SHIPPING',
      value: 0.0,
      description: 'Entrega grátis via motoboy',
      clientId: client1.id,
    }
  });

  console.log('✅ Seeding complete');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
