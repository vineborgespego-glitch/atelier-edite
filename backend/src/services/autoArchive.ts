import { prisma } from '../lib/prisma';
import { subDays } from 'date-fns';

/**
 * Automagically archives orders that have been DELIVERED for more than 7 days.
 */
export async function runAutoArchive() {
  const sevenDaysAgo = subDays(new Date(), 7);

  try {
    const result = await prisma.order.updateMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: {
          lte: sevenDaysAgo
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
