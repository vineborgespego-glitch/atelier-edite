import { useState, useEffect } from 'react';
import api from '../services/api';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Users, Scissors, Clock, DollarSign, Tag, UserPlus, TrendingUp, TrendingDown } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    monthlyRevenue: 0,
    previousMonthRevenue: 0,
    avgTicket: 0,
    newClientsThisMonth: 0,
    totalClients: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });

  const [statusChart, setStatusChart] = useState<number[]>([0, 0, 0, 0]);
  const [revenueSeries, setRevenueSeries] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    async function loadKpis() {
      try {
        const response = await api.get('/admin/kpis');
        const data = response.data.kpis;
        setKpis({
          monthlyRevenue: data.monthlyRevenue || 0,
          previousMonthRevenue: data.previousMonthRevenue || 0,
          avgTicket: data.avgTicket || 0,
          newClientsThisMonth: data.newClientsThisMonth || 0,
          totalClients: data.totalClients || 0,
          totalOrders: data.totalOrders || 0,
          pendingOrders: data.pendingOrders || 0,
        });

        // Doughnut: ['Corte', 'Costura', 'Finalizado', 'Entregue']
        const counts = response.data.charts?.statusCounts || {};
        const corte = (counts['DRAFT'] || 0) + (counts['CONFIRMED'] || 0);
        const costura = counts['IN_PRODUCTION'] || 0;
        const finalizado = (counts['READY'] || 0) + (counts['PAID'] || 0);
        const entregue = counts['DELIVERED'] || 0;
        setStatusChart([corte, costura, finalizado, entregue]);

        setRevenueSeries(response.data.charts?.revenueSeries || []);
      } catch (error) {
        console.error('Error fetching KPIs', error);
      }
    }
    loadKpis();
  }, []);

  // Comparativo de faturamento vs mês anterior
  const revTrend = (() => {
    const cur = kpis.monthlyRevenue;
    const prev = kpis.previousMonthRevenue;
    if (prev <= 0) return { pct: 0, up: null as boolean | null };
    const pct = ((cur - prev) / prev) * 100;
    return { pct, up: pct >= 0 };
  })();

  const doughnutData = {
    labels: ['Corte', 'Costura', 'Finalizado', 'Entregue'],
    datasets: [{
      data: statusChart,
      backgroundColor: ['#FDE8ED', '#A3D9C9', '#A9D5F5', '#F5D0A9'],
      borderWidth: 0,
    }]
  };

  const revenueBarData = {
    labels: revenueSeries.map(s => s.label),
    datasets: [{
      label: 'Faturamento',
      data: revenueSeries.map(s => s.value),
      backgroundColor: '#B5777B',
      borderRadius: 8,
      maxBarThickness: 48,
    }]
  };

  const revenueBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => brl(ctx.parsed.y) } },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v: any) => 'R$ ' + Number(v).toLocaleString('pt-BR') },
        grid: { color: '#F5E6E8' },
      },
      x: { grid: { display: false } },
    },
  };

  const MetricCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
    <div className="coquette-card flex items-center p-6">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${colorClass}`}>
        <Icon size={26} className={colorClass.includes('rosegold') ? 'text-white' : 'text-rosegold'} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-mauve">{title}</h3>
        <p className="font-display font-bold text-2xl text-dark truncate">{value}</p>
        {subtitle && <div className="mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );

  const trendNode = revTrend.up === null ? (
    <span className="text-xs text-mauve">sem comparativo</span>
  ) : (
    <span className={`text-xs font-medium flex items-center ${revTrend.up ? 'text-emerald-600' : 'text-red-500'}`}>
      {revTrend.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span className="ml-1">{Math.abs(revTrend.pct).toFixed(0)}% vs mês passado</span>
    </span>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-dark">Visão Geral</h1>
        <p className="text-mauve mt-1">Bem-vinda de volta, Maria! Aqui está o resumo das atividades do seu atelier.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Faturamento do mês"
          value={brl(kpis.monthlyRevenue)}
          icon={DollarSign}
          colorClass="bg-rosegold"
          subtitle={trendNode}
        />
        <MetricCard
          title="Ticket médio"
          value={brl(kpis.avgTicket)}
          icon={Tag}
          colorClass="bg-[#A3D9C9]"
        />
        <MetricCard
          title="Novos clientes no mês"
          value={kpis.newClientsThisMonth}
          icon={UserPlus}
          colorClass="bg-[#E5DDF5]"
        />
        <MetricCard
          title="Total de Clientes"
          value={kpis.totalClients}
          icon={Users}
          colorClass="bg-blush"
        />
        <MetricCard
          title="Pedidos Totais"
          value={kpis.totalOrders}
          icon={Scissors}
          colorClass="bg-[#E5DDF5]"
        />
        <MetricCard
          title="Em Andamento"
          value={kpis.pendingOrders}
          icon={Clock}
          colorClass="bg-[#FDE8ED]"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento dos últimos 6 meses */}
        <div className="coquette-card p-8 flex flex-col">
          <h3 className="font-display font-bold text-xl text-dark mb-6">Faturamento (últimos 6 meses)</h3>
          <div className="w-full h-64">
            <Bar data={revenueBarData} options={revenueBarOptions} />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="coquette-card p-8 flex flex-col items-center">
          <h3 className="font-display font-bold text-xl text-dark mb-6 text-center">Status dos Pedidos</h3>
          <div className="w-full max-w-xs aspect-square">
            <Doughnut
              data={doughnutData}
              options={{
                cutout: '75%',
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
