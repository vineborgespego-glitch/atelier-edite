import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Check, Calendar, Plus, Trash2, User, Phone, X } from 'lucide-react';

export default function OrderForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<any[]>([]);
  const [isNewClient, setIsNewClient] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardType, setCardType] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await api.get('/clients?limit=1000');
        setClients(response.data.clients || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    }
    fetchClients();
  }, []);

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isNewClient && !clientId) {
      setError('Por favor, informe o ID da cliente.');
      setLoading(false);
      return;
    }

    if (isPaid && !paymentMethod) {
      setError('Por favor, selecione a forma de pagamento (Dinheiro, Pix ou Cartão).');
      setLoading(false);
      return;
    }

    if (isPaid && paymentMethod === 'Cartão' && !cardType) {
      setError('Por favor, selecione se o cartão foi Débito ou Crédito.');
      setLoading(false);
      return;
    }

    // Formatação dos Itens
    const formattedItems = items.map(item => ({
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(String(item.unitPrice).replace(',', '.')) || 0
    }));

    try {
      let finalClientId;
      // Se for cliente nova, cria antes
      if (isNewClient) {
        const clientRes = await api.post('/clients', {
          name: clientName,
          phone: clientPhone
        });
        // API returns { client: { id, name, ... } }
        finalClientId = clientRes.data.client?.id || clientRes.data.id;
        if (!finalClientId) {
          setError('Erro ao cadastrar cliente. Verifique os dados e tente novamente.');
          setLoading(false);
          return;
        }
      } else {
        finalClientId = clientId;
      }

      let finalPaymentMethod = null;
      if (isPaid) {
        if (paymentMethod === 'Dinheiro') finalPaymentMethod = 'CASH';
        if (paymentMethod === 'Pix') finalPaymentMethod = 'PIX';
        if (paymentMethod === 'Cartão' && cardType === 'Débito') finalPaymentMethod = 'DEBIT_CARD';
        if (paymentMethod === 'Cartão' && cardType === 'Crédito') finalPaymentMethod = 'CREDIT_CARD';
      }

      // Cria pedido
      await api.post('/orders', {
        clientId: finalClientId,
        title: formattedItems[0]?.description || 'Serviço de Costura',
        description: `Entregar até ${deadline}`,
        items: formattedItems,
        dueDate: new Date(deadline).toISOString(),
        isPaid,
        paymentMethod: finalPaymentMethod
      });
      
      navigate('/app/orders');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((acc, curr) => acc + (Number(String(curr.unitPrice).replace(',', '.')) || 0) * (Number(curr.quantity) || 1), 0);

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col items-center pt-8 pb-12">
      <h1 className="text-3xl font-display font-medium text-dark mb-8 tracking-wide">Novo Registro de Pedido</h1>

      <div className="w-full bg-gradient-to-b from-[#B5777B]/80 to-[#9B7E8A]/90 p-8 rounded-[2rem] shadow-xl relative overflow-hidden backdrop-blur-sm border border-white/20">
        <div className="absolute top-4 right-4 text-white/50 text-2xl rotate-12">🎀</div>
        <div className="absolute bottom-4 left-4 text-white/50 text-2xl -rotate-12">🎀</div>

        <h2 className="text-2xl font-display italic text-white text-center mb-8 drop-shadow-md">
          Detalhes do Pedido
        </h2>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Client Toggle */}
          <div className="flex bg-white/20 p-1 rounded-xl">
            <button 
              type="button"
              onClick={() => setIsNewClient(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isNewClient ? 'bg-white text-rosegold shadow' : 'text-white hover:bg-white/10'}`}
            >
              Cliente Existente
            </button>
            <button 
              type="button"
              onClick={() => setIsNewClient(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isNewClient ? 'bg-white text-rosegold shadow' : 'text-white hover:bg-white/10'}`}
            >
              Nova Cliente
            </button>
          </div>

          {!isNewClient ? (
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-white/90 text-sm ml-2 font-medium">Localizar Cliente</label>
              <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
                <User className="absolute left-4 text-mauve" size={20} />
                <input 
                  type="text"
                  placeholder="Busque pelo nome..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setClientId(''); // Reseta ID se mudar o texto
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full bg-transparent p-4 pl-12 pr-12 text-dark focus:outline-none placeholder:text-mauve/50"
                />
                <button 
                  type="button"
                  onClick={() => {
                    setClientSearch('');
                    setClientId('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-4 text-[#B5777B]/60 hover:text-rosegold transition-colors cursor-pointer"
                >
                  {clientId ? <Check size={20} className="text-emerald-500" /> : <X size={20} />}
                </button>
              </div>

              {/* Dropdown de Sugestões */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/80 overflow-hidden z-50 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                  {clients.filter(c => 
                    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                    (c.phone && c.phone.includes(clientSearch))
                  ).length > 0 ? (
                    clients
                      .filter(c => 
                        c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
                        (c.phone && c.phone.includes(clientSearch))
                      )
                      .map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClientId(c.id);
                            setClientSearch(c.name);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left p-4 hover:bg-[#F5E6E8] border-b border-gray-100 last:border-none transition-colors group"
                        >
                          <div className="font-medium text-dark group-hover:text-rosegold">{c.name}</div>
                          {c.phone && <div className="text-[10px] text-mauve">Tel: {c.phone}</div>}
                        </button>
                      ))
                  ) : (
                    <div className="p-4 text-sm text-mauve italic text-center">Nenhuma cliente encontrada...</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-white/90 text-sm ml-2 font-medium">Nome Completo</label>
                <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
                  <User className="absolute left-4 text-mauve" size={20} />
                  <input 
                    type="text" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Maria da Silva"
                    required={isNewClient}
                    className="w-full bg-transparent p-4 pl-12 pr-12 text-dark placeholder:text-mauve/60 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-white/90 text-sm ml-2 font-medium">WhatsApp / Telefone</label>
                <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
                  <Phone className="absolute left-4 text-mauve" size={20} />
                  <input 
                    type="tel" 
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    required={isNewClient}
                    className="w-full bg-transparent p-4 pl-12 pr-12 text-dark placeholder:text-mauve/60 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-white/90 text-sm ml-2 font-medium">Prazo de Entrega</label>
            <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
              <Calendar className="absolute left-4 text-mauve" size={20} />
              <input 
                type="date" 
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-transparent p-4 pl-12 pr-12 text-dark placeholder:text-mauve/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/20 mt-6 space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer bg-white/10 p-4 rounded-xl hover:bg-white/20 transition-colors">
              <div className="relative flex items-center justify-center w-6 h-6 border-2 border-white/80 rounded-md bg-transparent data-[state=checked]:bg-emerald-400">
                <input 
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => {
                    setIsPaid(e.target.checked);
                    if (!e.target.checked) {
                      setPaymentMethod('');
                      setCardType('');
                    }
                  }}
                  className="opacity-0 absolute w-full h-full cursor-pointer"
                />
                {isPaid && <Check size={16} className="text-white relative z-10 pointer-events-none" />}
                {isPaid && <div className="absolute inset-0 bg-emerald-400 rounded-sm pointer-events-none"></div>}
              </div>
              <span className="text-white font-medium">Pago</span>
            </label>

            {isPaid && (
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4 ml-2 animate-in slide-in-from-top-2">
                <label className="text-white/90 text-sm font-medium">Forma de Pagamento</label>
                <div className="flex space-x-2">
                  {['Dinheiro', 'Pix', 'Cartão'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method !== 'Cartão') setCardType('');
                      }}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        paymentMethod === method ? 'bg-white text-rosegold shadow' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'Cartão' && (
                  <div className="flex space-x-2 pt-2 animate-in slide-in-from-top-1">
                    {['Débito', 'Crédito'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCardType(type)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                          cardType === type ? 'bg-white text-rosegold shadow' : 'border border-white/30 text-white hover:bg-white/10'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 pb-2 border-b border-white/20 flex justify-between items-center mt-2">
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
                <div className="relative">
                  <textarea 
                    rows={2}
                    required
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Ex: Costura de vestido floral..."
                    className="w-full bg-white/90 backdrop-blur-md rounded-xl p-3 text-dark placeholder:text-mauve/60 focus:outline-none focus:ring-2 focus:ring-white/50 border border-white/60 resize-none"
                  />
                </div>
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

          <div className="w-full mt-8 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full coquette-button text-lg py-4 shadow-[0_0_20px_rgba(181,119,123,0.3)] ring-2 ring-white ring-offset-2 ring-offset-[#FEF2ED] disabled:opacity-70 flex justify-center items-center space-x-2"
            >
              {loading ? <span>Aguarde...</span> : (
                <>
                  <span>Registrar Pedido</span>
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
