import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/admin/kpis
router.get('/kpis', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Date bounds
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Últimos 6 meses (do mais antigo para o atual)
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const last6Months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
  );

  const validStatus = { notIn: ['CANCELLED', 'ARCHIVED'] } as any;

  const [
    totalClients,
    totalOrders,
    pendingOrders,
    monthlyRevenueAggr,
    prevMonthRevenueAggr,
    avgTicketAggr,
    newClientsThisMonth,
    ordersByStatus
  ] = await Promise.all([
    prisma.client.count({ where: { userId } }),
    prisma.order.count({ where: { userId, status: { not: 'ARCHIVED' } } }),
    prisma.order.count({
      where: { userId, status: { in: ['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'PAID'] } }
    }),
    // Faturamento do mês atual
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { userId, createdAt: { gte: startOfMonth, lt: startOfNextMonth }, status: validStatus }
    }),
    // Faturamento do mês anterior (para o comparativo)
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { userId, createdAt: { gte: startOfPrevMonth, lt: startOfMonth }, status: validStatus }
    }),
    // Ticket médio geral (todos os pedidos válidos)
    prisma.order.aggregate({
      _avg: { totalAmount: true },
      where: { userId, status: validStatus }
    }),
    // Novos clientes no mês
    prisma.client.count({ where: { userId, createdAt: { gte: startOfMonth, lt: startOfNextMonth } } }),
    prisma.order.groupBy({
      by: ['status'],
      where: { userId, status: { not: 'ARCHIVED' } },
      _count: { _all: true }
    })
  ]);

  // Série de faturamento dos últimos 6 meses
  const revenueSeriesAggr = await Promise.all(
    last6Months.map((m) => {
      const start = m;
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      return prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { userId, createdAt: { gte: start, lt: end }, status: validStatus }
      });
    })
  );

  const num = (v: any) => Number(v || 0);

  const revenueSeries = last6Months.map((m, idx) => ({
    label: monthLabels[m.getMonth()],
    value: num(revenueSeriesAggr[idx]._sum?.totalAmount)
  }));

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
      monthlyRevenue: num(monthlyRevenueAggr._sum?.totalAmount),
      previousMonthRevenue: num(prevMonthRevenueAggr._sum?.totalAmount),
      avgTicket: num(avgTicketAggr._avg?.totalAmount),
      newClientsThisMonth
    },
    charts: {
      statusCounts,
      revenueSeries
    }
  });
});

export default router;
