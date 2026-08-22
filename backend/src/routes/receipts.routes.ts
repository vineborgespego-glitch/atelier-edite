import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { generateReceiptPDF } from '../services/pdfReceipt';
import { sendMedia } from '../services/waSend';
import { recordOutgoing } from '../services/waService';
import { receiptCaption } from '../services/waTemplates';

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

/**
 * POST /api/receipts/:orderId/send — manda o PDF do recibo pelo WhatsApp.
 * Antes a Maria baixava o arquivo e anexava na mão pelo wa.me; o recibo já
 * está em disco e o sendMedia já existe, então é só juntar os dois.
 */
router.post('/:orderId/send', async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.orderId, userId: req.userId },
    include: { client: true, receipt: true },
  });

  if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
  if (!order.client?.phone) return res.status(400).json({ error: 'Cliente sem telefone cadastrado' });
  if (!order.receipt?.pdfPath) return res.status(400).json({ error: 'Recibo ainda não foi gerado' });

  // pdfPath vem como "/uploads/arquivo.pdf"
  const fullPath = path.resolve(process.cwd(), order.receipt.pdfPath.replace(/^\//, ''));
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Arquivo do recibo não encontrado' });

  const fileName = `recibo-${order.receipt.receiptNumber}.pdf`;
  const caption = receiptCaption(order.client.name);

  const result = await sendMedia(order.client.phone, fs.readFileSync(fullPath).toString('base64'), {
    mediatype: 'document',
    mimetype: 'application/pdf',
    fileName,
    caption,
  });
  if (!result.ok) return res.status(502).json({ error: result.error });

  // Aponta para o PDF que já está no disco — não duplica o arquivo.
  await recordOutgoing(
    req.userId!,
    order.client.phone,
    caption,
    'document',
    order.receipt.pdfPath.replace(/^\//, '')
  ).catch((err) => console.error('[WA] Recibo enviado mas não registrado:', err?.message || err));

  return res.json({ ok: true });
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
