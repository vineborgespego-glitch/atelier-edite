import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/admin/kpis
router.get('/kpis', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Current month bounds
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalClients,
    totalOrders,
    pendingOrders,
    monthlyRevenueAggr,
    ordersByStatus
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.order.count({ 
      where: { 
        userId,
        status: { not: 'ARCHIVED' }
      } 
    }),
    prisma.order.count({ 
      where: { 
        userId, 
        status: { in: ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY'] } 
      } 
    }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        userId,
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: { notIn: ['CANCELLED', 'ARCHIVED'] }
      }
    }),
    prisma.order.groupBy({
      by: ['status'],
      where: { 
        userId,
        status: { not: 'ARCHIVED' }
      },
      _count: { _all: true }
    })
  ]);

  const revenue = monthlyRevenueAggr._sum?.totalAmount || 0;

  // Transform status aggregation for charts
  const statusCounts = ordersByStatus.reduce((acc, curr: any) => {
    const count = curr._count?._all || curr._count || 0;
    acc[curr.status] = typeof count === 'number' ? count : (count._all || 0);
    return acc;
  }, {} as Record<string, number>);

  return res.json({
    kpis: {
      totalClients,
      totalOrders,
      pendingOrders,
      monthlyRevenue: revenue
    },
    charts: {
      statusCounts
    }
  });
});

export default router;
