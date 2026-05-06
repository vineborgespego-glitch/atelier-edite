import { useState, useEffect } from 'react';
import { Save, Store, Mail, Phone, MapPin, CheckCircle2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [atelierName, setAtelierName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
      setAtelierName(u.atelierName || u.name || '');
      setEmail(u.email || '');
      setPhone(u.phone || '');
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const updatedUser = { ...user, atelierName, email, phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erro ao salvar as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-dark">Configurações do Atelier</h1>
        <p className="text-mauve mt-1">Personalize os dados que aparecerão nos recibos e comunicações.</p>
      </header>

      <div className="coquette-card p-8">
        <h2 className="text-xl font-display font-semibold text-dark mb-6 border-b border-[#F5E6E8] pb-4">
          Identidade do Negócio
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center space-x-2 border border-emerald-100 animate-in fade-in">
              <CheckCircle2 size={20} />
              <span className="font-medium">Configurações salvas com sucesso!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">Nome do Atelier</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Store size={18} className="text-mauve" />
                </div>
                <input 
                  type="text" 
                  value={atelierName} 
                  onChange={(e) => setAtelierName(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">CPF / CNPJ</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <input type="text" placeholder="000.000.000-00" className="w-full px-4 py-3 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">E-mail de Contato</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Mail size={18} className="text-mauve" />
                </div>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">Telefone / WhatsApp</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Phone size={18} className="text-mauve" />
                </div>
                <input 
                  type="text" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-dark">Endereço Físico (Opcional)</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <MapPin size={18} className="text-mauve" />
                </div>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua das Costureiras, 123" 
                  className="w-full pl-14 pr-4 py-3 focus:outline-none" 
                />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button type="submit" disabled={loading} className="coquette-button flex items-center space-x-2">
              <Save size={18} />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="coquette-card p-8 border-red-100 bg-red-50/10">
        <h2 className="text-xl font-display font-semibold text-red-700 mb-6 border-b border-red-100 pb-4">
          Conta e Acesso
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-dark font-medium">Encerrar Sessão</p>
            <p className="text-sm text-mauve">Saia da sua conta com segurança.</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white transition-all font-bold"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
}
