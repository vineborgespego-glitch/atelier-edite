import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: Record<string, unknown> = { userId: req.userId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { cpfCnpj: { contains: search } },
    ];
  }

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { name: 'asc' },
      include: { 
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
    }),
    prisma.client.count({ where }),
  ]);

  return res.json({ clients, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/clients/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const client = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      },
    },
  });

  if (!client) return res.status(404).json({ error: 'Cliente não encontrado' });
  return res.json({ client });
});

// POST /api/clients
router.post('/', async (req: AuthRequest, res: Response) => {
  const { name, email, phone, cpfCnpj, address, birthDate, notes, measures } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

  try {
    const client = await prisma.client.create({
      data: {
        userId: req.userId!,
        name,
        email,
        phone,
        cpfCnpj,
        address,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        notes,
        measures: measures || {},
      },
    });
    return res.status(201).json({ client });
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const { name, email, phone, cpfCnpj, address, birthDate, notes, measures } = req.body;

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: {
      name,
      email,
      phone,
      cpfCnpj,
      address,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      notes,
      measures: measures || existing.measures,
    },
  });

  return res.json({ client });
});

// PATCH /api/clients/:id/measures — Update measures only
router.patch('/:id/measures', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { measures: req.body.measures },
  });

  return res.json({ client });
});

// DELETE /api/clients/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  await prisma.client.delete({ where: { id: req.params.id } });
  return res.json({ message: 'Cliente removido com sucesso' });
});

export default router;
