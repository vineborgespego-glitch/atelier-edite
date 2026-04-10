import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Archive, Calendar, User, Package, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrderHistory() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadArchivedOrders();
  }, [page, search]);

  const loadArchivedOrders = async () => {
    setLoading(true);
    try {
      // Fetch only archived orders
      const response = await api.get(`/orders?includeArchived=true&status=ARCHIVED&page=${page}&limit=10`);
      setOrders(response.data.orders);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.client.name.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-dark flex items-center gap-2">
            <Archive className="text-rosegold" size={28} />
            Histórico de Pedidos
          </h1>
          <p className="text-mauve mt-1">Consulte todos os pedidos que já foram finalizados e arquivados.</p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mauve/50" size={18} />
          <input
            type="text"
            placeholder="Buscar por cliente ou nº..."
            className="coquette-input pl-10 w-full"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-mauve">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Carregando seu arquivo precioso...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="coquette-card p-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-cream rounded-full flex items-center justify-center mb-4 text-mauve/40">
            <Archive size={40} />
          </div>
          <h2 className="text-xl font-bold text-dark">Nenhum pedido arquivado</h2>
          <p className="text-mauve mt-2 max-w-sm">
            Pedidos aparecem aqui automaticamente após uma semana de entregues ou quando você os arquiva manualmente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="coquette-card p-5 hover:border-rosegold transition-all group">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-cream text-rosegold rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-rosegold group-hover:text-white transition-colors">
                      <Package size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-mauve/60 uppercase tracking-widest">{order.orderNumber}</span>
                        <span className="bg-success/20 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">ARQUIVADO</span>
                      </div>
                      <h3 className="text-lg font-bold text-dark mt-1">{order.title}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-mauve">
                        <span className="flex items-center gap-1"><User size={14} /> {order.client.name}</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> {format(new Date(order.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-xl font-display font-bold text-rosegold">
                      R$ {Number(order.totalAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button 
                      onClick={() => {/* Ver Detalhes */}}
                      className="text-xs text-mauve hover:text-rosegold font-bold uppercase tracking-wider"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-6">
            <p className="text-sm text-mauve">Mostrando {filteredOrders.length} de {total} pedidos</p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-[#F5E6E8] rounded-xl disabled:opacity-30 hover:bg-cream transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                disabled={page * 10 >= total}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-[#F5E6E8] rounded-xl disabled:opacity-30 hover:bg-cream transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
