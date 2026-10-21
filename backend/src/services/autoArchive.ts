import { prisma } from '../lib/prisma';
import { subDays } from 'date-fns';

/**
 * Automagically archives orders that have been DELIVERED for more than 15 days.
 * O atelier tem prazo de 15 dias para retoques/reconcerto após a entrega.
 */
export async function runAutoArchive() {
  const fifteenDaysAgo = subDays(new Date(), 15);

  try {
    const result = await prisma.order.updateMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          lte: fifteenDaysAgo
        }
      },
      data: {
        status: 'ARCHIVED'
      }
    });

    if (result.count > 0) {
      console.log(`[AutoArchive] ${result.count} orders archived successfully.`);
    }
  } catch (error) {
    console.error('[AutoArchive] Error running auto-archive:', error);
  }
}
