import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { User, Phone, Check } from 'lucide-react';

export default function ClientForm() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/clients', {
        name,
        phone
      });
      navigate('/app/clients');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao registrar cliente. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-[calc(100vh-8rem)] flex flex-col items-center pt-8 pb-12">
      <h1 className="text-3xl font-display font-medium text-dark mb-8 tracking-wide">Novo Cliente</h1>

      <div className="w-full bg-gradient-to-b from-[#B5777B]/80 to-[#9B7E8A]/90 p-8 rounded-[2rem] shadow-xl relative overflow-hidden backdrop-blur-sm border border-white/20">
        <div className="absolute top-4 right-4 text-white/50 text-2xl rotate-12">🎀</div>
        <div className="absolute bottom-4 left-4 text-white/50 text-2xl -rotate-12">🎀</div>

        <h2 className="text-2xl font-display italic text-white text-center mb-8 drop-shadow-md">
          Dados do Cliente
        </h2>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-white/90 text-sm ml-2 font-medium">Nome Completo</label>
            <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
              <User className="absolute left-4 text-mauve" size={20} />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria da Silva"
                className="w-full bg-transparent p-4 pl-12 pr-12 text-dark placeholder:text-mauve/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-white/90 text-sm ml-2 font-medium">Número do Telefone / WhatsApp</label>
            <div className="relative flex items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_0_15px_rgba(255,255,255,0.3)] border border-white/60 focus-within:ring-4 focus-within:ring-white/30">
              <Phone className="absolute left-4 text-mauve" size={20} />
              <input 
                type="tel" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-transparent p-4 pl-12 pr-12 text-dark placeholder:text-mauve/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="w-full mt-8 pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full coquette-button text-lg py-4 shadow-[0_0_20px_rgba(181,119,123,0.3)] ring-2 ring-white ring-offset-2 ring-offset-[#FEF2ED] disabled:opacity-70 flex justify-center items-center space-x-2"
            >
              {loading ? <span>Aguarde...</span> : (
                <>
                  <span>Registrar Cliente</span>
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
