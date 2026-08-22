import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { linkContactsForClient } from '../services/waService';

const router = Router();
router.use(authenticate);

// GET /api/clients
router.get('/', async (req: AuthRequest, res: Response) => {
  const { search, page = '1', limit = '20', archived = 'false' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Por padrão a lista mostra só as ativas; ?archived=true mostra só as arquivadas.
  const where: Record<string, unknown> = {
    userId: req.userId,
    archivedAt: archived === 'true' ? { not: null } : null,
  };
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
    // Duplicate check by phone (cleaning numbers for comparison)
    if (phone) {
      const cleanedInput = phone.replace(/\D/g, '');
      // Arquivada não bloqueia: senão o telefone fica preso para sempre
      // depois de arquivar um cadastro errado.
      const existingClients = await prisma.client.findMany({
        where: { userId: req.userId!, archivedAt: null }
      });

      const duplicate = existingClients.find(c => 
        c.phone && c.phone.replace(/\D/g, '') === cleanedInput
      );

      if (duplicate) {
        return res.status(400).json({ error: `Cliente já cadastrado com este número: ${duplicate.name}` });
      }
    }

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

    // Vincula conversas de WhatsApp já registradas deste telefone (não bloqueia a resposta)
    linkContactsForClient(req.userId!, client.id, phone).catch((err) =>
      console.error('[WA] Vínculo retroativo falhou:', err?.message || err)
    );

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
      // null limpa a data; undefined (campo ausente no body) mantém a atual
      birthDate: birthDate === undefined ? undefined : birthDate ? new Date(birthDate) : null,
      notes,
      measures: measures || existing.measures,
    },
  });

  // Telefone pode ter mudado — tenta vincular conversas de WhatsApp órfãs
  linkContactsForClient(req.userId!, client.id, phone).catch((err) =>
    console.error('[WA] Vínculo retroativo falhou:', err?.message || err)
  );

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

/**
 * DELETE /api/clients/:id — ARQUIVA, não apaga.
 * Apagar de verdade era ruim dos dois lados: com pedidos o banco recusa
 * (FK RESTRICT) e a Maria via um erro genérico; sem pedidos sumia para sempre
 * e ainda deixava a conversa de WhatsApp órfã. Arquivar tira das listas e das
 * mensagens automáticas, e dá para voltar atrás.
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  await prisma.client.update({
    where: { id: req.params.id },
    data: { archivedAt: new Date() },
  });
  return res.json({ message: 'Cliente arquivado' });
});

// POST /api/clients/:id/restore — desfaz o arquivamento
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  const existing = await prisma.client.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) return res.status(404).json({ error: 'Cliente não encontrado' });

  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: { archivedAt: null },
  });
  return res.json({ client });
});

export default router;
