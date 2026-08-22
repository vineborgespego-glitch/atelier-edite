import { useState, useEffect } from 'react';
import api from '../services/api';
import { Send, Loader2, Check, X, Pencil, Inbox } from 'lucide-react';

interface OutboxItem {
  id: string;
  phone: string;
  content: string;
  msgType: string;
  error: string | null;
  createdAt: string;
  client: { id: string; name: string } | null;
}

const ROTULO: Record<string, string> = {
  auto_postsale: 'Pós-venda',
  auto_birthday: 'Aniversário',
  auto_reactivation: 'Reativação',
};

export default function Outbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviandoLote, setEnviandoLote] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/whatsapp/outbox');
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Erro ao carregar a fila:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // O envio em lote sai espaçado no servidor; recarregar mostra sumindo aos poucos.
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const aprovar = async (item: OutboxItem) => {
    setBusy(item.id);
    try {
      const content = editando === item.id ? texto : undefined;
      await api.post(`/whatsapp/outbox/${item.id}/approve`, { content });
      setEditando(null);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error: any) {
      alert(`Não foi possível enviar: ${error.response?.data?.error || error.message}`);
      load();
    } finally {
      setBusy(null);
    }
  };

  const descartar = async (item: OutboxItem) => {
    if (!window.confirm('Descartar esta mensagem? Ela não será enviada.')) return;
    setBusy(item.id);
    try {
      await api.post(`/whatsapp/outbox/${item.id}/reject`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error: any) {
      alert(`Erro ao descartar: ${error.response?.data?.error || error.message}`);
    } finally {
      setBusy(null);
    }
  };

  const aprovarTudo = async () => {
    if (!window.confirm(`Enviar as ${items.length} mensagens? Elas saem uma a cada 40 segundos.`)) return;
    setEnviandoLote(true);
    try {
      await api.post('/whatsapp/outbox/approve-all', { ids: items.map((i) => i.id) });
    } catch (error: any) {
      alert(`Erro: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-dark flex items-center gap-2">
            <Send className="text-rosegold" size={22} /> A enviar
          </h1>
          <p className="text-sm text-mauve mt-1">
            Nada aqui foi enviado ainda. Avisos de pedido novo e de pedido pronto saem sozinhos e não aparecem nesta lista.
          </p>
        </div>
        {items.length > 1 && (
          <button
            onClick={aprovarTudo}
            disabled={enviandoLote}
            className="coquette-button flex items-center gap-2 flex-shrink-0 disabled:opacity-60"
          >
            {enviandoLote ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Enviar todas
          </button>
        )}
      </header>

      {enviandoLote && (
        <div className="mb-4 rounded-xl bg-blush/40 border border-[#F5E6E8] px-4 py-3 text-sm text-dark">
          Enviando uma a cada 40 segundos para o WhatsApp não bloquear o número. Pode fechar a tela, o envio continua.
        </div>
      )}

      {loading ? (
        <div className="coquette-card p-8 text-center text-mauve">
          <Loader2 className="animate-spin mx-auto" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="coquette-card p-10 text-center text-mauve">
          <Inbox size={28} className="mx-auto mb-2 opacity-50" />
          Nenhuma mensagem esperando aprovação.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="coquette-card p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-dark text-sm truncate">
                    {item.client?.name || item.phone}
                  </p>
                  <span className="text-xs text-rosegold bg-blush/60 rounded-full px-2 py-0.5">
                    {ROTULO[item.msgType] || item.msgType}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setEditando(editando === item.id ? null : item.id);
                      setTexto(item.content);
                    }}
                    className="p-2 text-mauve hover:text-rosegold transition-colors"
                    title="Editar o texto antes de enviar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => descartar(item)}
                    disabled={busy === item.id}
                    className="p-2 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Descartar sem enviar"
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={() => aprovar(item)}
                    disabled={busy === item.id}
                    className="flex items-center gap-1 bg-rosegold text-white rounded-xl px-3 py-1.5 text-sm disabled:opacity-50"
                  >
                    {busy === item.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                    Enviar
                  </button>
                </div>
              </div>

              {editando === item.id ? (
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[#F5E6E8] p-3 text-sm text-dark outline-none focus:border-rosegold"
                />
              ) : (
                <p className="text-sm text-dark whitespace-pre-wrap bg-cream/50 rounded-xl p-3">{item.content}</p>
              )}

              {item.error && <p className="mt-2 text-xs text-red-500">{item.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
