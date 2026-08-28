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
 * Gera o recibo automaticamente se ainda não existir para não dar erro 400/CORS.
 */
router.post('/:orderId/send', async (req: AuthRequest, res: Response) => {
  const inicio = Date.now();
  try {
    let order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.userId },
      include: { client: true, receipt: true, items: true, user: true },
    });

    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    if (!order.client?.phone) return res.status(400).json({ error: 'Cliente sem telefone cadastrado' });

    // Se o recibo ainda não foi gerado, gera agora automaticamente
    let pdfPath = order.receipt?.pdfPath;
    let receiptNumber = order.receipt?.receiptNumber;

    if (!pdfPath || !receiptNumber) {
      const year = new Date().getFullYear();
      const count = await prisma.receipt.count({ where: { userId: req.userId } });
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      receiptNumber = `REC-${year}-${String(count + 1).padStart(5, '0')}-${randomSuffix}`;
      
      pdfPath = await generateReceiptPDF(order, receiptNumber);

      const total = order.totalAmount;
      const receipt = await prisma.receipt.upsert({
        where: { orderId: order.id },
        update: { totalAmount: total, amountInWords: `${total.toFixed(2)} reais`, pdfPath },
        create: {
          userId: req.userId!,
          orderId: order.id,
          receiptNumber,
          totalAmount: total,
          amountInWords: `${total.toFixed(2)} reais`,
          paymentMethod: 'CASH',
          pdfPath,
        }
      });
      order.receipt = receipt;
    }

    const fullPath = path.resolve(process.cwd(), pdfPath.replace(/^\//, ''));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Arquivo do recibo não encontrado no servidor' });
    }

    const fileName = `recibo-${receiptNumber}.pdf`;
    const caption = `Olá ${order.client.name}! Segue o comprovante do seu pedido no Atelier Édite. 🎀`;
    
    // Tenta enviar a mídia via WhatsApp
    try {
      const base64 = fs.readFileSync(fullPath).toString('base64');
      const { sendMedia } = await import('../services/waSendMedia');
      const result = await sendMedia(order.client.phone, base64, {
        mediatype: 'document',
        mimetype: 'application/pdf',
        fileName,
        caption,
      });

      return res.json({ ok: true, result, pdfUrl: pdfPath });
    } catch (waErr: any) {
      console.warn('[WA Send Media] Falha ao enviar pela Evolution GO, retornando link:', waErr?.message);
      return res.json({ ok: true, sentViaApi: false, waError: waErr?.message, pdfUrl: pdfPath });
    }
  } catch (err: any) {
    console.error('[Recibo] Falha ao enviar:', err?.stack || err?.message || err);
    return res.status(500).json({ error: err?.message || 'Erro ao enviar o recibo' });
  } finally {
    console.log(`[Recibo] /send respondeu em ${Date.now() - inicio}ms`);
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
