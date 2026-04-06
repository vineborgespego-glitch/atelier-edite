import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Mock implementation of WhatsApp notification via WhatsHelp
async function sendWhatsHelpMock(phone: string, message: string) {
  console.log(`[WhatsHelp Mock] To: ${phone} | Msg: ${message}`);
  // Em produção, isso faria uma requisição POST real para api.whatshelp.io
  return true;
}

// POST /api/notifications/whatsapp
router.post('/whatsapp', async (req: AuthRequest, res: Response) => {
  const { orderId, clientId, type } = req.body;

  if (!orderId || !clientId || !type) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const client = await prisma.client.findFirst({ where: { id: clientId, userId: req.userId } });
  const order = await prisma.order.findFirst({ where: { id: orderId, userId: req.userId } });

  if (!client || !order) {
    return res.status(404).json({ error: 'Cliente ou Pedido não encontrado' });
  }

  if (!client.phone) {
    return res.status(400).json({ error: 'Cliente não possui número de WhatsApp cadastrado' });
  }

  let message = '';
  if (type === 'ORDER_CONFIRMED') {
    message = `Olá, ${client.name}! Seu pedido #${order.orderNumber} ("${order.title}") foi confirmado no nosso atelier! 💞 Acompanhe o status com a gente.`;
  } else if (type === 'ORDER_READY') {
    message = `Seu pedido está pronto, ${client.name}! ✨ Seu #${order.orderNumber} já pode ser retirado ou despachado.`;
  } else if (type === 'THANK_YOU_COUPON') {
    message = `Muito obrigada pela preferência, ${client.name}! Como mimo, aqui está seu cupom "PORTES-GRATIS" para usar na próxima compra. 🎀`;
  } else {
    message = req.body.message || 'Mensagem do Atelier Édite.';
  }

  try {
    const success = await sendWhatsHelpMock(client.phone, message);

    const notification = await prisma.notification.create({
      data: {
        orderId,
        clientId,
        channel: 'WHATSAPP',
        type,
        message,
        status: success ? 'SENT' : 'FAILED',
        sentAt: success ? new Date() : null
      }
    });

    return res.json({ notification, success });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao enviar notificação' });
  }
});

// GET /api/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { order: { userId: req.userId } },
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } }, order: { select: { orderNumber: true } } }
  });
  return res.json({ notifications });
});

export default router;
