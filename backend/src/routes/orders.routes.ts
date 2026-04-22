import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { validateOrder } from '../services/orderValidation';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET /api/orders
router.get('/', async (req: AuthRequest, res: Response) => {
  const { status, clientId, page = '1', limit = '20', includeArchived = 'false' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = { userId: req.userId };
  
  if (status) {
    where.status = status;
  } else if (includeArchived !== 'true') {
    // Hide archived by default
    where.status = { not: 'ARCHIVED' };
  }

  if (clientId) where.clientId = clientId;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        items: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return res.json({ orders, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      client: true,
      items: true,
      receipt: true,
    },
  });

  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  return res.json({ order });
});

// POST /api/orders
router.post('/', async (req: AuthRequest, res: Response) => {
  const { clientId, title, description, dueDate, discount = 0, isPaid = false, paymentMethod, items } = req.body;

  // Debug log for production diagnostics
  console.log('Order Creation Request:', {
    hasClientId: !!clientId,
    clientIdValue: clientId,
    hasTitle: !!title,
    hasItems: !!items && Array.isArray(items),
    itemsCount: Array.isArray(items) ? items.length : 0
  });

  if (!clientId) {
    return res.status(400).json({ 
      error: `Faltando: ID da Cliente (Recebido: "${clientId}")` 
    });
  }
  if (!title) return res.status(400).json({ error: 'Faltando: Título/Descrição do Serviço' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Faltando: Itens do Serviço' });
  }

  // Calculate totals
  let calculatedTotal = 0;
  const processedItems = items.map((item: any) => {
    const qty = Number(item.quantity || 1);
    const price = Number(item.unitPrice || 0);
    const subtotal = qty * price;
    calculatedTotal += subtotal;
    return {
      description: item.description,
      fabric: item.fabric,
      quantity: new Prisma.Decimal(qty),
      unitPrice: new Prisma.Decimal(price),
      subtotal: new Prisma.Decimal(subtotal),
      notes: item.notes,
    };
  });

  const finalAmount = calculatedTotal - Number(discount);

  // Auto-validation Engine
  const validation = validateOrder(
    { dueDate: new Date(dueDate), totalAmount: new Prisma.Decimal(finalAmount) },
    processedItems as any
  );

  if (!validation.isValid) {
    return res.status(400).json({ 
      error: 'Falha na validação do pedido', 
      details: validation.errors 
    });
  }

  try {
    const year = new Date().getFullYear();
    const count = await prisma.order.count({ where: { userId: req.userId } });
    
    // Adicionar um sufixo aleatório curto (3 letras) para garantir unicidade mesmo em concorrência
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(4, '0')}-${randomSuffix}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: req.userId!,
        clientId,
        title,
        description,
        dueDate: new Date(dueDate),
        status: 'CONFIRMED',
        paidAt: isPaid ? new Date() : null,
        paymentMethod: paymentMethod || null,
        totalAmount: new Prisma.Decimal(finalAmount),
        deposit: isPaid ? new Prisma.Decimal(finalAmount) : new Prisma.Decimal(0),
        discount: new Prisma.Decimal(discount),
        validationResult: validation as any,
        items: {
          create: processedItems
        }
      },
      include: { items: true, client: true }
    });

    return res.status(201).json({ order, warnings: validation.warnings });
  } catch (error: any) {
    console.error('❌ FATAL: Create order error:', error);
    
    // Retornar erro detalhado para o frontend poder nos mostrar o que houve
    return res.status(500).json({ 
      error: 'Erro interno ao salvar pedido', 
      details: error.message,
      code: error.code // Código do Prisma (ex: P2002 para conflito de ID)
    });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status é obrigatório' });

  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });

  const updateData: any = { status };
  if (status === 'DELIVERED') updateData.deliveredAt = new Date();

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: updateData,
  });

  return res.json({ order });
});

// PATCH /api/orders/:id/pay
router.patch('/:id/pay', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });

  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { 
      paidAt: new Date(),
      status: existing.status === 'READY' ? 'PAID' : existing.status // Opcional: ajustar status se necessário
    },
  });

  return res.json({ order });
});

// DELETE /api/orders/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Pedido não encontrado' });

  await prisma.order.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Pedido removido com sucesso' });
});

export default router;
