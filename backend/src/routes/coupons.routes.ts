import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET /api/coupons
router.get('/', async (req: AuthRequest, res: Response) => {
  const coupons = await prisma.coupon.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ coupons });
});

// POST /api/coupons
router.post('/', async (req: AuthRequest, res: Response) => {
  const { code, type, value, description, clientId, minOrderValue, expiresAt } = req.body;

  if (!code || !type || !value || !description) {
    return res.status(400).json({ error: 'Campos obrigatórios faltando' });
  }

  try {
    const coupon = await prisma.coupon.create({
      data: {
        userId: req.userId!,
        code: code.toUpperCase(),
        type,
        value: new Prisma.Decimal(value),
        description,
        clientId,
        minOrderValue: minOrderValue ? new Prisma.Decimal(minOrderValue) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }
    });
    return res.status(201).json({ coupon });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Código de cupom já existe' });
    }
    return res.status(500).json({ error: 'Erro ao criar cupom' });
  }
});

// POST /api/coupons/validate
router.post('/validate', async (req: AuthRequest, res: Response) => {
  const { code, clientId, orderValue } = req.body;
  if (!code) return res.status(400).json({ error: 'Código é obrigatório' });

  const coupon = await prisma.coupon.findFirst({
    where: { 
      userId: req.userId,
      code: code.toUpperCase(),
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    }
  });

  if (!coupon) return res.status(404).json({ error: 'Cupom inválido ou expirado' });
  if (coupon.clientId && coupon.clientId !== clientId) {
    return res.status(403).json({ error: 'Este cupom não é válido para este cliente' });
  }
  if (coupon.minOrderValue && Number(orderValue) < Number(coupon.minOrderValue)) {
    return res.status(400).json({ error: `Valor mínimo do pedido para este cupom é R$ ${coupon.minOrderValue}` });
  }

  return res.json({ coupon });
});

export default router;
