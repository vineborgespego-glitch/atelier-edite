import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { Check, Calendar, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react';

export default function OrderEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await api.get(`/orders/${id}`);
        const order = response.data.order;

        setClientName(order.client?.name || '');
        setNotes(order.notes || '');

        // Format dueDate to YYYY-MM-DD for the date input
        if (order.dueDate) {
          setDeadline(order.dueDate.substring(0, 10));
        }

        // Map existing items
        setItems(order.items.map((item: any) => ({
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: String(Number(item.unitPrice).toFixed(2)).replace('.', ','),
        })));
      } catch (err) {
        setError('Não foi possível carregar o pedido.');
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [id]);

  const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: '' }]);

  const removeItem = (index: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const total = useMemo(() => {
    return items.reduce((acc, item) => {
      const price = parseFloat(String(item.unitPrice).replace(',', '.')) || 0;
      const qty = parseFloat(String(item.quantity)) || 0;
      return acc + price * qty;
    }, 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const formattedItems = items.map(item => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: parseFloat(String(item.unitPrice).replace(',', '.')) || 0,
    }));

    try {
      await api.put(`/orders/${id}`, {
        dueDate: deadline ? new Date(deadline).toISOString() : undefined,
        notes,
        items: formattedItems,
      });
      navigate('/app/orders');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 size={40} className="text-rosegold animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col items-center pt-8 pb-12">
      <div className="flex items-center w-full mb-6 space-x-3">
        <button onClick={() => navigate('/app/orders')} className="text-mauve hover:text-rosegold transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-display font-medium text-dark tracking-wide">Editar Pedido</h1>
      </div>

      <div className="w-full bg-gradient-to-b from-[#B5777B]/80 to-[#9B7E8A]/90 p-8 rounded-[2rem] shadow-xl relative overflow-hidden backdrop-blur-sm border border-white/20">
        <div className="absolute top-4 right-4 text-white/50 text-2xl rotate-12">🎀</div>

        <h2 className="text-xl font-display italic text-white text-center mb-2 drop-shadow-md">
          {clientName}
        </h2>
        <p className="text-center text-white/60 text-xs mb-6">Edite os dados abaixo e salve.</p>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-white/90 text-sm ml-2 font-medium">Prazo de Entrega</label>
            <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
              <Calendar className="absolute left-4 text-mauve" size={20} />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-transparent p-4 pl-12 pr-4 text-dark focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-white/90 text-sm ml-2 font-medium">Observações (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre o pedido..."
              className="w-full bg-white/90 rounded-2xl p-4 text-dark placeholder:text-mauve/60 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/60 resize-none"
            />
          </div>

          {/* Items */}
          <div className="pt-4 border-t border-white/20 flex justify-between items-center">
            <h3 className="text-white font-medium text-lg">Itens do Serviço</h3>
            <span className="text-white/80 font-bold">Total: R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>

          {items.map((item, index) => (
            <div key={index} className="bg-white/10 p-4 rounded-xl space-y-4 border border-white/10 relative">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(index)} className="absolute top-2 right-2 text-white/60 hover:text-white bg-red-400/20 rounded-full p-1 transition-colors">
                  <Trash2 size={16} />
                </button>
              )}

              <div className="space-y-1">
                <label className="text-white/90 text-xs ml-1 font-medium">Peça {index + 1}</label>
                <textarea
                  rows={2}
                  required
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Ex: Costura de vestido floral..."
                  className="w-full bg-white/90 rounded-xl p-3 text-dark placeholder:text-mauve/60 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/60 resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <div className="space-y-1 w-1/3">
                  <label className="text-white/90 text-xs ml-1 font-medium">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full bg-white/90 rounded-xl p-3 text-dark focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
                <div className="space-y-1 w-2/3">
                  <label className="text-white/90 text-xs ml-1 font-medium">Valor Unitário</label>
                  <div className="relative flex items-center bg-white/90 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-white/50">
                    <span className="pl-3 text-mauve font-medium text-sm">R$</span>
                    <input
                      type="text"
                      required
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-transparent p-3 text-dark focus:outline-none placeholder:text-mauve/60"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="w-full border border-white flex justify-center items-center py-2 rounded-xl text-white hover:bg-white hover:text-rosegold transition-colors space-x-2"
          >
            <Plus size={18} />
            <span>Adicionar Peça</span>
          </button>

          <div className="w-full mt-6 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full coquette-button text-lg py-4 shadow-[0_0_20px_rgba(181,119,123,0.3)] ring-2 ring-white ring-offset-2 ring-offset-[#FEF2ED] disabled:opacity-70 flex justify-center items-center space-x-2"
            >
              {saving ? <span>Salvando...</span> : (
                <>
                  <span>Salvar Alterações</span>
                  <Check size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
