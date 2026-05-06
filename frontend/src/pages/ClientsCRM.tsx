import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, ChevronRight, ChevronDown, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const getWhatsAppLink = (phone: string) => {
  if (!phone) return '#';
  let cleaned = phone.replace(/\D/g, ''); // Remove everything except digits
  
  // Case 1: Only the number without DDD (8 or 9 digits)
  if (cleaned.length === 8 || cleaned.length === 9) {
    cleaned = '5541' + cleaned; // Adds Brazil (55) and Curitiba (41) as default
  } 
  // Case 2: Number with DDD but without country code (10 or 11 digits)
  else if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned;
  }
  
  return `https://wa.me/${cleaned}`;
};

export default function ClientsCRM() {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadClients() {
      try {
        const response = await api.get('/clients?limit=1000');
        const formatted = response.data.clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          cpfCnpj: c.cpfCnpj,
          alert: !c.cpfCnpj ? 'Documento ausente, por favor verificar.' : undefined,
          expanded: false,
          orders: (c.orders || []).map((o: any) => {
            let color = 'bg-blush';
            if (o.status === 'READY') color = 'bg-info';
            if (o.status === 'DELIVERED' || o.status === 'PAID') color = 'bg-success';
            
            return {
              id: `#${o.id}`,
              date: format(new Date(o.createdAt), 'dd/MM/yy'),
              status: o.status,
              color
            };
          })
        }));
        setClients(formatted);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    }
    loadClients();
  }, []);

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('TEM CERTEZA? Isso excluirá o cliente e TODOS os seus pedidos permanentemente. Esta ação não pode ser desfeita!')) return;
    
    try {
      await api.delete(`/clients/${id}`);
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Não foi possível excluir o cliente. Verifique se há pedidos ativos que impedem a exclusão ou tente novamente.');
    }
  };

  const toggleExpand = (id: string) => {
    setClients(clients.map(c => c.id === id ? { ...c, expanded: !c.expanded } : c));
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-dark">Cadastro de Clientes</h1>
          <div className="mt-2 text-rosegold flex space-x-4 w-full">
            🎀 —————— 🎀
          </div>
        </div>
        <button onClick={() => window.location.href = '/app/clients/new'} className="coquette-button flex items-center space-x-2">
          <span>+ Novo Cliente</span>
        </button>
      </header>

      {/* Search Bar matching mockup */}
      <div className="relative w-full mb-8">
        <Search size={20} className="absolute left-4 top-3.5 text-mauve" />
        <input 
          type="text" 
          placeholder="Buscar cliente..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-white shadow-sm rounded-full pl-12 pr-4 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
      </div>

      <div className="space-y-4">
        {filteredClients.map(client => (
          <div key={client.id} className="coquette-card p-0 overflow-hidden">
            <div className="p-5 flex items-start justify-between bg-white">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-[#E5DDF5] border-2 border-[#E5DDF5] flex items-center justify-center text-[#9B7E8A]">
                    <span className="text-2xl pt-1">👤</span>
                  </div>
                  <span className="absolute -top-1 -right-1 text-rosegold text-xs">🎀</span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-lg text-dark">{client.name}</h3>
                  <div className="flex items-center text-sm text-mauve mt-0.5">
                    {client.phone ? client.phone : 'Sem telefone'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleDeleteClient(client.id)}
                  className="p-2 bg-red-50 text-red-400 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                  title="Excluir Cliente Permanentemente"
                >
                  <Trash2 size={20} />
                </button>

                {client.phone && (
                  <a 
                    href={getWhatsAppLink(client.phone)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-full hover:bg-[#25D366]/20 transition-colors"
                    title="Enviar WhatsApp"
                  >
                    <MessageCircle size={20} />
                  </a>
                )}
                
                {client.orders.length > 0 ? (
                  <button onClick={() => toggleExpand(client.id)} className="p-2 text-mauve hover:text-rosegold transition-colors">
                    {client.expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                  </button>
                ) : (
                  <button className="p-2 text-mauve/30 cursor-not-allowed">
                    <ChevronRight size={24} />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Orders Section */}
            {client.expanded && client.orders.length > 0 && (
              <div className="px-5 pb-5 pt-2 border-t border-[#F5E6E8]/50">
                <div className="flex items-center justify-center space-x-3 text-[#D5C2C9] mb-4 text-xs">
                  💜 —————— 🎀 —————— 💜
                </div>
                <h4 className="font-medium text-dark mb-3">Últimos Pedidos</h4>
                <div className="space-y-2">
                  {client.orders.map((order: any, idx: number) => (
                    <div key={idx} className={`w-full flex items-center justify-between p-3 rounded-xl ${order.color} bg-opacity-70 cursor-pointer hover:opacity-80 transition-opacity`}>
                      <span className="text-dark">Pedido {order.id} - {order.date} - {order.status}</span>
                      <div className="flex items-center space-x-2">
                        {client.phone && (
                          <a 
                            href={getWhatsAppLink(client.phone)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 hover:text-emerald-600 transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </a>
                        )}
                        <ChevronRight size={18} className="text-dark/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
