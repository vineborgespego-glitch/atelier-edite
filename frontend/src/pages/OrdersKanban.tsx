import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Scissors, CheckSquare, CheckCircle2, ChevronRight, Plus, FileText, GripVertical, Package, X, Download, Loader2, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Visual → Backend status map
const VISUAL_TO_BACKEND: Record<string, string> = {
  'Recebido': 'CONFIRMED',
  'Em Costura': 'IN_PRODUCTION',
  'Pronto': 'READY',
  'Entregue': 'DELIVERED',
};

export default function OrdersKanban() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
      alert(`Erro ao gerar recibo: ${error.response?.data?.error || error.message}`);
    } finally {
      setGeneratingId(null);
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
      number: `ORD-${new Date(o.createdAt).getFullYear()}-${String(o.id).padStart(3, '0')}`,
      client: o.client.name,
      title: o.items[0]?.description || 'Serviços Diversos',
      qty: o.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0),
      status: visualStatus,
      progress,
      isPaid: o.paidAt !== null,
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
    } catch (error) {
      console.error('Failed to update status:', error);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: order.status, progress: order.progress } : o));
      alert('Não foi possível atualizar o status. Tente novamente.');
    }
  };

  const onDragEnd = () => setDragOverCol(null);
  // ──────────────────────────────────────────────────────────────────────────

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
                {orders.filter(o => o.status === col.status).length}
              </span>
              {dragOverCol === col.status && (
                <span className="ml-auto text-xs text-mauve animate-pulse">Solte aqui ✨</span>
              )}
            </h3>

            {/* Drop zone hint when empty */}
            {orders.filter(o => o.status === col.status).length === 0 && (
              <div className={`flex-1 min-h-[80px] rounded-xl border-2 border-dashed flex items-center justify-center text-sm text-mauve/50 transition-all ${dragOverCol === col.status ? 'border-rosegold text-rosegold' : 'border-[#F5E6E8]'}`}>
                {dragOverCol === col.status ? 'Solte para mover aqui 🎀' : 'Arraste um pedido aqui'}
              </div>
            )}

            <div className="space-y-4">
              {orders.filter(o => o.status === col.status).map(order => (
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
                      <h4 className="font-medium text-dark">Pedido {order.number}</h4>
                    </div>
                    <span className="text-rosegold">🎀</span>
                  </div>
                  <p className="text-sm text-mauve mb-1 ml-6">{order.client}</p>
                  <p className="text-sm text-dark mb-2 ml-6">{order.title}, Qtd: {order.qty}</p>

                  {order.isPaid && (
                    <div className="mb-3 ml-6">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider">Pago Antecipado</span>
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

                  {/* Receipt Generator Button */}
                  <div className="pt-2 mt-2 border-t border-[#F5E6E8] flex justify-end">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(order.id); }}
                      disabled={generatingId === order.id}
                      className="flex items-center space-x-1 text-xs text-rosegold hover:text-dark transition-colors font-medium border border-[#F5E6E8] hover:border-rosegold rounded-md px-2 py-1 bg-white disabled:opacity-50"
                    >
                      {generatingId === order.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <FileText size={14} />
                      )}
                      <span>{generatingId === order.id ? 'Gerando...' : 'Gerar PDF'}</span>
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
                  onClick={() => window.open(previewUrl, '_blank')}
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
            <footer className="p-4 border-t border-[#F5E6E8] bg-white flex justify-center space-x-4">
              <button 
                onClick={() => setPreviewUrl(null)}
                className="px-6 py-2 border border-[#F5E6E8] text-mauve rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Fechar
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center space-x-2 px-8 py-2 bg-rosegold text-white rounded-xl hover:bg-dark transition-all shadow-md hover:shadow-lg text-sm font-bold scale-105 active:scale-100"
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
