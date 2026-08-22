import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { MessageCircle, Send, Loader2, AlertCircle, Paperclip } from 'lucide-react';

interface WaMessage {
  id: string;
  direction: 'IN' | 'OUT';
  content: string;
  msgType: string;
  transcription: string | null;
  mediaPath: string | null;
  createdAt: string;
}

// O backend serve os arquivos em /uploads; VITE_API_URL termina em /api.
const FILES_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
const mediaUrl = (p: string) => `${FILES_BASE}/${p.replace(/^\//, '')}`;

interface WaContact {
  id: string;
  phone: string;
  name: string | null;
  updatedAt: string;
  client: { id: string; name: string } | null;
  messages: WaMessage[]; // só a última, vinda do GET /contacts
}

/** Conversa no vácuo: o cliente falou por último e ninguém respondeu. */
function aguardandoResposta(contact: WaContact): boolean {
  const last = contact.messages?.[0];
  return !!last && last.direction === 'IN';
}

function horas(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function nomeContato(c: WaContact): string {
  return c.client?.name || c.name || c.phone;
}

/** Foto, vídeo, áudio ou arquivo dentro do balão. */
function Midia({ m }: { m: WaMessage }) {
  if (!m.mediaPath) return null;
  const url = mediaUrl(m.mediaPath);

  if (m.msgType === 'image' || m.msgType === 'sticker') {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="imagem recebida" className="rounded-lg max-h-64 w-auto mb-1" />
      </a>
    );
  }
  if (m.msgType === 'video') {
    return <video src={url} controls className="rounded-lg max-h-64 w-auto mb-1" />;
  }
  if (m.msgType === 'audio') {
    return <audio src={url} controls className="mb-1 max-w-full" />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-rosegold underline mb-1">
      <Paperclip size={12} /> abrir arquivo
    </a>
  );
}

export default function WhatsAppInbox() {
  const [contacts, setContacts] = useState<WaContact[]>([]);
  const [selected, setSelected] = useState<WaContact | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadContacts = async () => {
    try {
      const res = await api.get('/whatsapp/contacts');
      setContacts(res.data.contacts || []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (contactId: string) => {
    try {
      const res = await api.get(`/whatsapp/contacts/${contactId}/messages`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    }
  };

  // Sem websocket: o volume de um atelier não justifica. 30s basta.
  useEffect(() => {
    loadContacts();
    const t = setInterval(() => {
      loadContacts();
      if (selected) loadMessages(selected.id);
    }, 30000);
    return () => clearInterval(t);
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const abrir = (c: WaContact) => {
    setSelected(c);
    setMessages([]);
    loadMessages(c.id);
  };

  const enviarArquivo = async (file: File) => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('number', selected.phone);
      if (draft.trim()) form.append('caption', draft.trim());

      await api.post('/whatsapp/send-media', form);
      setDraft('');
      await loadMessages(selected.id);
      loadContacts();
    } catch (error: any) {
      alert(`Não foi possível enviar o arquivo: ${error.response?.data?.error || error.message}`);
    } finally {
      setSending(false);
    }
  };

  const enviar = async () => {
    if (!selected || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    try {
      await api.post('/whatsapp/send', { number: selected.phone, text });
      setDraft('');
      await loadMessages(selected.id);
      loadContacts();
    } catch (error: any) {
      alert(`Não foi possível enviar: ${error.response?.data?.error || error.message}`);
    } finally {
      setSending(false);
    }
  };

  const pendentes = contacts.filter(aguardandoResposta);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-dark flex items-center gap-2">
          <MessageCircle className="text-rosegold" size={24} /> WhatsApp
        </h1>
        <p className="text-sm text-mauve mt-1">
          {pendentes.length > 0
            ? `${pendentes.length} conversa(s) esperando resposta`
            : 'Nenhuma conversa esperando resposta'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lista de conversas */}
        <div className="bg-white rounded-2xl border border-[#F5E6E8] overflow-hidden md:h-[70vh] md:overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-mauve">
              <Loader2 className="animate-spin mx-auto" size={20} />
            </div>
          ) : contacts.length === 0 ? (
            <p className="p-6 text-sm text-mauve text-center">Nenhuma conversa ainda.</p>
          ) : (
            contacts.map((c) => {
              const last = c.messages?.[0];
              const esperando = aguardandoResposta(c);
              return (
                <button
                  key={c.id}
                  onClick={() => abrir(c)}
                  className={`w-full text-left px-4 py-3 border-b border-[#F5E6E8] transition-colors ${
                    selected?.id === c.id ? 'bg-blush/40' : 'hover:bg-cream'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-dark text-sm truncate">{nomeContato(c)}</span>
                    {esperando && (
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium text-rosegold bg-blush/60 rounded-full px-2 py-0.5 flex-shrink-0"
                        title={`Sem resposta há ${Math.floor(horas(last!.createdAt))}h`}
                      >
                        <AlertCircle size={10} /> responder
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mauve truncate mt-0.5">
                    {last ? `${last.direction === 'OUT' ? 'Você: ' : ''}${last.content}` : 'sem mensagens'}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Conversa */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-[#F5E6E8] flex flex-col md:h-[70vh]">
          {!selected ? (
            <p className="m-auto text-sm text-mauve p-8 text-center">Escolha uma conversa para ver o histórico.</p>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-[#F5E6E8]">
                <p className="font-medium text-dark text-sm">{nomeContato(selected)}</p>
                <p className="text-xs text-mauve">{selected.phone}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        m.direction === 'OUT' ? 'bg-blush/60 text-dark' : 'bg-cream text-dark'
                      }`}
                    >
                      <Midia m={m} />
                      {m.content}
                      {m.transcription && (
                        <p className="mt-1 text-xs text-mauve italic">
                          {m.msgType === 'image' ? `na foto: ${m.transcription}` : `"${m.transcription}"`}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-mauve">
                        {formatHora(m.createdAt)}
                        {m.msgType.startsWith('auto_') && ' · automática'}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="p-3 border-t border-[#F5E6E8] flex gap-2 items-center">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) enviarArquivo(f);
                    e.target.value = ''; // permite reenviar o mesmo arquivo
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={sending}
                  title="Enviar foto, vídeo ou arquivo (a legenda é o texto escrito ao lado)"
                  className="text-mauve hover:text-rosegold disabled:opacity-50 p-2"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && enviar()}
                  placeholder="Escreva sua resposta..."
                  className="flex-1 rounded-xl border border-[#F5E6E8] px-3 py-2 text-sm outline-none focus:border-rosegold"
                />
                <button
                  onClick={enviar}
                  disabled={sending || !draft.trim()}
                  className="bg-rosegold text-white rounded-xl px-4 py-2 disabled:opacity-50 flex items-center"
                >
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
