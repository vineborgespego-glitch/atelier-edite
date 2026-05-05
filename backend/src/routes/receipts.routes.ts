import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { generateReceiptPDF } from '../services/pdfReceipt';

const router = Router();
router.use(authenticate);

// POST /api/receipts/:orderId/generate
router.post('/:orderId/generate', async (req: AuthRequest, res: Response) => {
  const { paymentMethod } = req.body;

  try {
    const { orderId } = req.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId, userId: req.userId },
      include: { items: true, client: true, user: true, receipt: true }
    });

    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Generate unique receipt number with random suffix to avoid conflicts
    const year = new Date().getFullYear();
    const count = await prisma.receipt.count({ where: { userId: req.userId } });
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `REC-${year}-${String(count + 1).padStart(5, '0')}-${randomSuffix}`;

    // Create PDF File
    const pdfPath = await generateReceiptPDF(order, receiptNumber);

    // Save Receipt to DB
    let finalPaymentMethod: any = paymentMethod || order.paymentMethod || 'CASH';
    
    // Simple normalization to ensure it matches the Enum
    const methodMap: Record<string, string> = {
      'Dinheiro': 'CASH',
      'Pix': 'PIX',
      'Cartão': 'CREDIT_CARD', // Default for 'Cartão' if not specific
      'Débito': 'DEBIT_CARD',
      'Crédito': 'CREDIT_CARD',
      'PIX': 'PIX',
      'CASH': 'CASH',
      'CREDIT_CARD': 'CREDIT_CARD',
      'DEBIT_CARD': 'DEBIT_CARD'
    };

    let normalizedMethod: string;
    if (methodMap[finalPaymentMethod]) {
      normalizedMethod = methodMap[finalPaymentMethod];
    } else {
      normalizedMethod = 'OTHER';
    }

    const total = order.totalAmount;

    // Create or Update receipt record
    const receipt = await prisma.receipt.upsert({
      where: { orderId: orderId },
      update: {
        totalAmount: total,
        amountInWords: `${total.toFixed(2)} reais`,
        paymentMethod: (normalizedMethod as any),
        pdfPath: pdfPath,
      },
      create: {
        userId: req.userId!,
        orderId: orderId,
        receiptNumber,
        totalAmount: total,
        amountInWords: `${total.toFixed(2)} reais`,
        paymentMethod: (normalizedMethod as any),
        pdfPath: pdfPath,
      }
    });

    return res.status(201).json({ receipt, url: pdfPath });
  } catch (error: any) {
    console.error('Receipt generation error:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar recibo.', 
      details: error?.message || 'Erro desconhecido',
      code: error?.code,
    });
  }
});

// GET /api/receipts
router.get('/', async (req: AuthRequest, res: Response) => {
  const receipts = await prisma.receipt.findMany({
    where: { userId: req.userId },
    orderBy: { issuedAt: 'desc' },
    include: { order: { select: { orderNumber: true, client: { select: { name: true } } } } }
  });
  return res.json({ receipts });
});

export default router;
