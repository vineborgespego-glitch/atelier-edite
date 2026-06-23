import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Scissors, CheckSquare, CheckCircle2, ChevronRight, Plus, FileText, GripVertical, Package, X, Download, Loader2, Printer, Archive, DollarSign, Calendar, Pencil, Trash2, Search } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// Visual → Backend status map
const VISUAL_TO_BACKEND: Record<string, string> = {
  'Recebido': 'CONFIRMED',
  'Em Costura': 'IN_PRODUCTION',
  'Pronto': 'READY',
  'Entregue': 'DELIVERED',
};

// Avisos automaticos no WhatsApp ao mudar o status do pedido.
// Sem emojis de proposito: o WhatsApp Web/Desktop no Windows corrompe emojis
// vindos de links wa.me (viram "?"/quadradinho). Como a Maria envia pelo
// computador, mantemos o texto limpo para nunca quebrar.
const INSTAGRAM_URL = 'https://instagram.com/borgesmariaedite';
const GOOGLE_REVIEW_URL = 'https://www.google.com/maps?cid=18089226519185099016'; // perfil/avaliações no Google

function notifyClientByStatus(order: any, newVisualStatus: string) {
  // So dispara nos status "Pronto" (finalizado) e "Entregue"
  if (newVisualStatus !== 'Pronto' && newVisualStatus !== 'Entregue') return;

  const digits = (order?.clientPhone || '').replace(/\D/g, '');
  if (!digits) return; // sem telefone cadastrado, nao ha como avisar
  const phone = '55' + digits;
  const clientName = order?.client || 'cliente';

  const text = newVisualStatus === 'Pronto'
    ? `Oi ${clientName}! Passando para avisar que o seu pedido no Atelier Edite está prontinho e finalizado!`
    : `${clientName}, foi um prazer costurar para você!\n\nSe quiser acompanhar nossos trabalhos, siga a gente no Instagram: ${INSTAGRAM_URL}\n\nE se puder, deixe sua avaliação no Google — ajuda demais o nosso atelier!\n${GOOGLE_REVIEW_URL}`;

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  setTimeout(() => window.open(waUrl, '_blank'), 300);
}

export default function OrdersKanban() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentReceiptOrder, setCurrentReceiptOrder] = useState<any | null>(null);
  const dragId = useRef<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    if (iframeRef.current) {
      // Focus the iframe then call print
      iframeRef.current.contentWindow?.focus();
      iframeRef.current.contentWindow?.print();
    }
  };

  const handleGenerateReceipt = async (orderId: string) => {
    setGeneratingId(orderId);
    try {
      // Busca os dados completos do pedido (incluindo telefone do cliente) direto da API
      const orderRes = await api.get(`/orders/${orderId}`);
      const fullOrder = orderRes.data.order;
      setCurrentReceiptOrder({
        id: fullOrder.id,
        client: fullOrder.client?.name || '',
        clientPhone: fullOrder.client?.phone || '',
      });

      const response = await api.post(`/receipts/${orderId}/generate`, { paymentMethod: 'CASH' });
      // Base URL from the API env, removing /api suffix if present
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
      const finalServerUrl = `${baseUrl}${response.data.url}`;

      // Bypass "Connection Refused" / iframe blocking by loading as a local Blob
      const fileResponse = await fetch(finalServerUrl);
      if (!fileResponse.ok) throw new Error('Não foi possível carregar o arquivo PDF');
      
      const blob = await fileResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      setPreviewUrl(objectUrl);
    } catch (error: any) {
      console.error('Error generating receipt:', error);
      alert(`Erro ao gerar recibo: ${error.response?.data?.details || error.response?.data?.error || error.message}`);
    } finally {
      setGeneratingId(null);
    }
  };


  const handleNextStatus = async (orderId: string, currentVisualStatus: string) => {
    const statusOrder = ['Recebido', 'Em Costura', 'Pronto', 'Entregue'];
    const currentIndex = statusOrder.indexOf(currentVisualStatus);
    if (currentIndex === -1 || currentIndex === statusOrder.length - 1) return;

    const nextVisualStatus = statusOrder[currentIndex + 1];
    const backendStatus = VISUAL_TO_BACKEND[nextVisualStatus];
    const order = orders.find(o => o.id === orderId);

    try {
      await api.patch(`/orders/${orderId}/status`, { status: backendStatus });
      setOrders(prev => prev.map(o => {
        if (o.id !== orderId) return o;
        const progress = nextVisualStatus === 'Recebido' ? 25 : nextVisualStatus === 'Em Costura' ? 50 : nextVisualStatus === 'Pronto' ? 75 : 100;
        return { ...o, status: nextVisualStatus, progress };
      }));
      notifyClientByStatus(order, nextVisualStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao avançar pedido.');
    }
  };

  const handleArchive = async (orderId: string) => {
    if (!window.confirm('Deseja arquivar este pedido? Ele sairá da tela principal e irá para o histórico.')) return;

    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'ARCHIVED' });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Error archiving order:', error);
      alert('Erro ao arquivar pedido.');
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/pay`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isPaid: true } : o));
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Erro ao registrar pagamento.');
    }
  };

  const handleDelete = async (orderId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      try {
        await api.delete(`/orders/${orderId}`);
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Erro ao excluir pedido.');
      }
    }
  };

  const mapOrder = (o: any) => {
    let visualStatus = 'Recebido';
    let progress = 25;
    if (o.status === 'IN_PRODUCTION') { visualStatus = 'Em Costura'; progress = 50; }
    if (o.status === 'READY') { visualStatus = 'Pronto'; progress = 75; }
    if (o.status === 'DELIVERED') { visualStatus = 'Entregue'; progress = 100; }
    if (o.status === 'PAID') { visualStatus = 'Pronto'; progress = 75; }

    return {
      id: o.id,
      number: o.orderNumber?.split('-').pop() || '0000',
      client: o.client.name,
      clientPhone: o.client.phone || '',
      title: o.items[0]?.description || 'Serviços Diversos',
      qty: o.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0),
      status: visualStatus,
      progress,
      isPaid: o.paidAt !== null,
      amount: o.totalAmount,
      dueDate: (() => {
        if (!o.dueDate) return 'A definir';
        // Directly slice the ISO string (e.g. "2026-05-15T00:00:00.000Z" → "2026-05-15")
        // This avoids ALL timezone conversion issues
        const [year, month, day] = o.dueDate.substring(0, 10).split('-');
        return `${day}/${month}/${year}`;
      })(),
    };
  };

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await api.get('/orders?limit=1000');
        setOrders(response.data.orders.map(mapOrder));
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    }
    loadOrders();
  }, []);

  // Check if we should automatically open a receipt
  useEffect(() => {
    if (location.state?.openReceiptFor) {
      const orderId = location.state.openReceiptFor;
      
      // Limpa o estado silenciosamente para evitar loops no React Router ao recarregar a página
      window.history.replaceState({}, document.title);
      
      // Um pequeno delay garante que o DOM e os hooks estão prontos antes da chamada da API
      setTimeout(() => {
        handleGenerateReceipt(orderId);
      }, 500);
    }
  }, [location.state]);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const onDragStart = (orderId: string) => {
    dragId.current = orderId;
  };

  const onDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    setDragOverCol(colStatus);
  };

  const onDrop = async (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const id = dragId.current;
    if (!id) return;

    const order = orders.find(o => o.id === id);
    if (!order || order.status === colStatus) return;

    const backendStatus = VISUAL_TO_BACKEND[colStatus];
    if (!backendStatus) return;

    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const progress = colStatus === 'Recebido' ? 25 : colStatus === 'Em Costura' ? 50 : colStatus === 'Pronto' ? 75 : 100;
      return { ...o, status: colStatus, progress };
    }));

    try {
      await api.patch(`/orders/${id}/status`, { status: backendStatus });
      notifyClientByStatus(order, colStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: order.status, progress: order.progress } : o));
      alert('Não foi possível atualizar o status. Tente novamente.');
    }
  };

  const onDragEnd = () => setDragOverCol(null);
  // ──────────────────────────────────────────────────────────────────────────

  // Filtra os cards pelo nome do cliente, sem distinção de maiúsculas/minúsculas
  const matchesSearch = (o: any) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return o.client?.toLowerCase().includes(term);
  };

  const columns = [
    { title: 'Recebido', status: 'Recebido', icon: Package, color: 'bg-[#E5DDF5]/60 text-[#9B7E8A]', bar: 'bg-[#E5DDF5]', dropBorder: 'border-[#E5DDF5] bg-[#E5DDF5]/10' },
    { title: 'Em Costura', status: 'Em Costura', icon: Scissors, color: 'bg-blush text-rosegold', bar: 'bg-blush', dropBorder: 'border-rosegold bg-blush/10' },
    { title: 'Pronto', status: 'Pronto', icon: CheckSquare, color: 'bg-success/30 text-emerald-700', bar: 'bg-success', dropBorder: 'border-emerald-400 bg-emerald-50' },
    { title: 'Entregue', status: 'Entregue', icon: CheckCircle2, color: 'bg-warning/30 text-orange-700', bar: 'bg-warning', dropBorder: 'border-orange-400 bg-orange-50' },
  ];

  return (
    <div className="h-full flex flex-col relative">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-dark">Acompanhamento de Status</h1>
          <p className="text-mauve mt-1">Arraste os pedidos entre as colunas para atualizar o status. 👆</p>
        </div>
        <button onClick={() => navigate('/app/orders/new')} className="coquette-button flex items-center space-x-2">
          <Plus size={18} />
          <span>Novo Pedido</span>
        </button>
      </header>

      {/* Search Bar — busca por nome do cliente */}
      <div className="relative w-full max-w-md mb-6">
        <Search size={20} className="absolute left-4 top-3.5 text-mauve" />
        <input
          type="text"
          placeholder="Buscar por nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-white shadow-sm rounded-full pl-12 pr-10 py-3 text-dark focus:outline-none focus:ring-2 focus:ring-accent transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-3.5 text-mauve hover:text-rosegold transition-colors"
            title="Limpar busca"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Visual Pipeline Header */}
      <div className="flex w-full mb-8 overflow-x-auto pb-2">
        {columns.map((col, idx) => {
          const Icon = col.icon;
          return (
            <div key={col.title} className="flex items-center min-w-[150px] flex-1">
              <div className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border border-white/50 shadow-sm ${col.color} bg-opacity-50`}>
                <Icon size={24} className="mb-1" />
                <span className="font-medium text-sm text-dark">{col.title}</span>
              </div>
              {idx < columns.length - 1 && (
                <div className="text-[#E8D5D7] mx-2">
                  <ChevronRight size={24} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex space-x-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div
            key={col.status}
            className={`w-72 flex-shrink-0 flex flex-col rounded-2xl transition-all duration-200 ${dragOverCol === col.status ? `border-2 border-dashed ${col.dropBorder} p-2` : 'border-2 border-transparent'}`}
            onDragOver={(e) => onDragOver(e, col.status)}
            onDrop={(e) => onDrop(e, col.status)}
            onDragLeave={() => setDragOverCol(null)}
          >
            <h3 className="font-display font-bold text-lg mb-4 text-dark flex items-center">
              {col.title}
              <span className="ml-2 bg-white text-xs py-0.5 px-2 rounded-full text-mauve shadow-sm">
                {orders.filter(o => o.status === col.status && matchesSearch(o)).length}
              </span>
              {dragOverCol === col.status && (
                <span className="ml-auto text-xs text-mauve animate-pulse">Solte aqui ✨</span>
              )}
            </h3>

            {/* Drop zone hint when empty */}
            {orders.filter(o => o.status === col.status && matchesSearch(o)).length === 0 && (
              <div className={`flex-1 min-h-[80px] rounded-xl border-2 border-dashed flex items-center justify-center text-sm text-mauve/50 transition-all ${dragOverCol === col.status ? 'border-rosegold text-rosegold' : 'border-[#F5E6E8]'}`}>
                {dragOverCol === col.status ? 'Solte para mover aqui 🎀' : 'Arraste um pedido aqui'}
              </div>
            )}

            <div className="space-y-4">
              {orders.filter(o => o.status === col.status && matchesSearch(o)).map(order => (
                <div
                  key={order.id}
                  draggable
                  onDragStart={() => onDragStart(order.id)}
                  onDragEnd={onDragEnd}
                  className="coquette-card hover:border-rosegold cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95 transition-all group select-none"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <GripVertical size={16} className="text-mauve/30 group-hover:text-mauve/60 transition-colors flex-shrink-0" />
                      <h4 className="font-display font-bold text-dark text-lg">{order.client}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                        className="text-mauve/40 hover:text-red-400 transition-colors p-1"
                        title="Excluir Pedido"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className="text-rosegold text-xl">🎀</span>
                    </div>
                  </div>

                  <div className="ml-6 space-y-1 mb-3">
                    <p className="text-sm font-bold text-rosegold">
                      Total: R$ {Number(order.amount).toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-xs text-mauve flex items-center">
                      <Calendar size={12} className="mr-1" />
                      Entrega: {order.dueDate}
                    </p>
                    <p className="text-[10px] text-mauve/60 italic line-clamp-1">
                      {order.title}
                    </p>
                  </div>

                  {order.isPaid && (
                    <div className="mb-3 ml-6">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Pago</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-xs text-mauve mb-1">
                    <span className={`px-2 py-1 rounded-full font-medium ${col.color}`}>{col.status}</span>
                    <span>{order.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-cream rounded-full relative overflow-hidden mb-2">
                    <div className={`absolute top-0 left-0 h-full ${col.bar} rounded-full transition-all duration-500`} style={{ width: `${order.progress}%` }}></div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 mt-2 border-t border-[#F5E6E8] flex justify-between items-center">
                    <div className="flex space-x-2">
                      {!order.isPaid && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(order.id); }}
                          className="flex items-center space-x-1 text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors font-bold uppercase tracking-tighter border border-emerald-200"
                          title="Marcar como Pago"
                        >
                          <DollarSign size={14} />
                          <span>Pagar</span>
                        </button>
                      )}
                      
                      {order.status !== 'Entregue' ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleNextStatus(order.id, order.status); }}
                          className="flex items-center space-x-1 text-[10px] text-rosegold hover:bg-blush/30 px-2 py-1 rounded transition-colors font-bold uppercase tracking-tighter border border-blush"
                          title="Avançar para o próximo status"
                        >
                          <ChevronRight size={14} />
                          <span>Avançar</span>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleArchive(order.id); }}
                          className="flex items-center space-x-1 text-[10px] text-mauve hover:bg-dark hover:text-white px-2 py-1 rounded transition-colors font-bold uppercase tracking-tighter border border-mauve"
                          title="Arquivar pedido entregue"
                        >
                          <Archive size={14} />
                          <span>Arquivar</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(order.id); }}
                      disabled={generatingId === order.id}
                      className="flex items-center space-x-1 text-[10px] text-mauve/60 hover:text-rosegold transition-colors font-medium rounded-md px-1 py-1"
                    >
                      {generatingId === order.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Printer size={12} />
                      )}
                      <span>Recibo</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/app/orders/${order.id}/edit`); }}
                      className="flex items-center space-x-1 text-[10px] text-blue-400 hover:text-blue-600 transition-colors font-medium rounded-md px-1 py-1"
                      title="Editar pedido"
                    >
                      <Pencil size={12} />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-4 border-b border-[#F5E6E8] flex items-center justify-between bg-cream/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-rosegold/10 text-rosegold rounded-full flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-dark">Pré-visualização do Recibo</h3>
                  <p className="text-xs text-mauve">Confira os dados antes de imprimir ou salvar.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => window.open(previewUrl!, '_blank')}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#E5DDF5] text-[#9B7E8A] rounded-xl hover:bg-[#D5C2C9] transition-colors text-sm font-medium"
                >
                  <Download size={18} />
                  <span>Download</span>
                </button>
                <button 
                  onClick={() => setPreviewUrl(null)}
                  className="p-2 text-mauve hover:text-dark hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
            </header>
            <div className="flex-1 bg-gray-100 p-4 relative">
              <iframe 
                ref={iframeRef}
                src={`${previewUrl}#toolbar=0`} 
                className="w-full h-full rounded-xl border border-gray-200 shadow-inner bg-white"
                title="PDF Preview"
              />
            </div>
            <footer className="p-4 border-t border-[#F5E6E8] bg-white flex justify-center space-x-3 flex-wrap gap-y-2">
              <button 
                onClick={() => setPreviewUrl(null)}
                className="px-6 py-2 border border-[#F5E6E8] text-mauve rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  // 1. Faz download do PDF automaticamente
                  const a = document.createElement('a');
                  a.href = previewUrl!;
                  a.download = `recibo-${currentReceiptOrder?.client || 'pedido'}.pdf`;
                  a.click();

                  // 2. Abre o WhatsApp com a mensagem e o número do cliente
                  const rawPhone = currentReceiptOrder?.clientPhone || '';
                  const phone = '55' + rawPhone.replace(/\D/g, '');
                  const clientName = currentReceiptOrder?.client || 'cliente';
                  const message = encodeURIComponent(
                    `Ol\u00e1 ${clientName}!\n\nSegue o comprovante do seu pedido no *Atelier Edite*.\n\nQualquer d\u00favida estou \u00e0 disposi\u00e7\u00e3o!`
                  );
                  const waUrl = phone.length > 4
                    ? `https://wa.me/${phone}?text=${message}`
                    : `https://wa.me/?text=${message}`;
                  setTimeout(() => window.open(waUrl, '_blank'), 500);
                }}
                className="flex items-center space-x-2 px-5 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md text-sm font-bold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.121 1.528 5.847L0 24l6.335-1.508A11.933 11.933 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.373l-.36-.214-3.727.977.999-3.638-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                </svg>
                <span>Enviar no WhatsApp</span>
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center space-x-2 px-8 py-2 bg-rosegold text-white rounded-xl hover:bg-dark transition-all shadow-md hover:shadow-lg text-sm font-bold"
              >
                <Printer size={18} />
                <span>Imprimir Recibo</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
