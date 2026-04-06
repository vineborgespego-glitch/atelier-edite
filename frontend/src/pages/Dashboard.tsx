import { useState, useEffect } from 'react';
import api from '../services/api';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Users, Scissors, Clock } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function Dashboard() {
  const [kpis, setKpis] = useState({
    revenue: 0,
    clients: 0,
    orders: 0,
    pending: 0
  });

  const [statusChart, setStatusChart] = useState<number[]>([0, 0, 0, 0]);

  useEffect(() => {
    async function loadKpis() {
      try {
        const response = await api.get('/admin/kpis');
        const data = response.data.kpis;
        setKpis({
          revenue: 0, // Ignored
          clients: data.totalClients || 0,
          orders: data.totalOrders || 0,
          pending: data.pendingOrders || 0
        });

        // Map status counts to doughnut chart labels: ['Corte', 'Costura', 'Finalizado', 'Entregue']
        const counts = response.data.charts?.statusCounts || {};
        const corte = (counts['DRAFT'] || 0) + (counts['CONFIRMED'] || 0);
        const costura = counts['IN_PRODUCTION'] || 0;
        const finalizado = counts['READY'] || 0;
        const entregue = (counts['DELIVERED'] || 0) + (counts['PAID'] || 0);
        setStatusChart([corte, costura, finalizado, entregue]);

      } catch (error) {
        console.error('Error fetching KPIs', error);
      }
    }
    loadKpis();
  }, []);



  const doughnutData = {
    labels: ['Corte', 'Costura', 'Finalizado', 'Entregue'],
    datasets: [{
      data: statusChart,
      backgroundColor: ['#FDE8ED', '#A3D9C9', '#A9D5F5', '#F5D0A9'],
      borderWidth: 0,
    }]
  };

  const MetricCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <div className="coquette-card flex items-center p-6">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mr-4 ${colorClass}`}>
        <Icon size={26} className={colorClass.includes('rosegold') ? 'text-white' : 'text-rosegold'} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-mauve">{title}</h3>
        <p className="font-display font-bold text-2xl text-dark">{value}</p>
      </div>
    </div>
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
          title="Total de Clientes" 
          value={kpis.clients} 
          icon={Users} 
          colorClass="bg-blush" 
        />
        <MetricCard 
          title="Pedidos Totais" 
          value={kpis.orders} 
          icon={Scissors} 
          colorClass="bg-[#E5DDF5]" 
        />
        <MetricCard 
          title="Em Andamento" 
          value={kpis.pending} 
          icon={Clock} 
          colorClass="bg-[#FDE8ED]" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6">
        {/* Status Breakdown (Centrado e maior) */}
        <div className="coquette-card p-8 flex flex-col items-center">
          <h3 className="font-display font-bold text-xl text-dark mb-6 text-center">Status dos Pedidos</h3>
          <div className="w-full max-w-md aspect-square">
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
