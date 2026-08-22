import { subDays } from 'date-fns';
import { prisma } from '../lib/prisma';
import { queueMessage } from './waOutbox';
import { postSaleTemplate } from './waTemplates';

/**
 * Pós-venda: 3 dias depois da entrega, pergunta se ficou tudo certo e pede
 * avaliação. Menos que os 7 dias do auto-archive de propósito — senão o pedido
 * já saiu de DELIVERED antes da gente falar com o cliente.
 */
const DIAS = 3;

export async function runPostSale() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        postSaleSentAt: null,
        deliveredAt: { lte: subDays(new Date(), DIAS) },
      },
      include: { client: true },
    });

    for (const order of orders) {
      if (!order.client?.phone) {
        // Sem telefone nunca vai dar certo — marca para não tentar todo dia.
        await prisma.order.update({ where: { id: order.id }, data: { postSaleSentAt: new Date() } });
        continue;
      }
      const text = postSaleTemplate(order, order.client.name);
      await queueMessage(order.userId, order.client.phone, text, 'auto_postsale', order.clientId);
      // Marca ao ENFILEIRAR, não ao enviar: senão o job reenfileira a mesma
      // cliente todo dia enquanto ela espera a aprovação da Maria.
      await prisma.order.update({ where: { id: order.id }, data: { postSaleSentAt: new Date() } });
    }

    if (orders.length) console.log(`[PostSale] ${orders.length} pedido(s) processado(s).`);
  } catch (error) {
    console.error('[PostSale] Erro:', error);
  }
}
