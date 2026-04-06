import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import api from '../../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        // Login Request
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        navigate('/app/dashboard');
      } else {
        // Register Request
        const response = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', response.data.token);
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row items-center font-body selection:bg-rosegold selection:text-white">

      {/* Left Branding Side (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 min-h-screen bg-gradient-to-br from-[#B5777B] to-[#9B7E8A] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Decorative */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 2px, transparent 2px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative z-10">
          <h1 className="font-display font-bold text-3xl text-white tracking-tight">Atelier Édite</h1>
        </div>

        <div className="relative z-10 text-white max-w-md">
          <h2 className="text-4xl font-display font-bold mb-6 italic pt-8 border-t border-white/20">A costura é uma arte. A gestão também deve ser.</h2>
          <p className="text-white/80 text-lg">Centralize as medidas de suas clientes, automatize os recibos e encante com o seu atendimento.</p>
        </div>

        <div className="relative z-10 text-white/50 text-sm">
          © 2026 Atelier Édite
        </div>
      </div>

      {/* Right Login/Register Flow */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Mobile Heading */}
          <div className="md:hidden text-center mb-10">
            <h1 className="font-display font-bold text-3xl text-rosegold tracking-tight mb-2">Atelier Édite</h1>
            <p className="text-mauve text-sm">A gestão que entende a arte da costura.</p>
          </div>

          <div className="coquette-card p-8 sm:p-10 !rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rosegold to-accent"></div>

            <h2 className="text-2xl font-display font-bold text-dark mb-1 text-center">
              {isLogin ? 'Bem-vinda de volta' : 'Crie seu Atelier'}
            </h2>
            <p className="text-mauve text-sm text-center mb-8">
              {isLogin ? 'Entre com seus dados para acessar o painel.' : 'Junte-se a nós para transformar a gestão.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {!isLogin && (
                <div className="space-y-1">
                  <label className="text-dark text-sm ml-1 font-medium">Nome do Atelier</label>
                  <div className="relative">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome ou marca" className="coquette-input pl-4 bg-cream/30 border-[#F5E6E8]" required={!isLogin} />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-dark text-sm ml-1 font-medium">E-mail</label>
                <div className="relative flex items-center">
                  <Mail size={18} className="absolute left-4 text-mauve" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@exemplo.com" className="coquette-input pl-12 bg-cream/30 border-[#F5E6E8]" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-dark text-sm ml-1 font-medium">Senha</label>
                <div className="relative flex items-center">
                  <Lock size={18} className="absolute left-4 text-mauve" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="coquette-input pl-12 bg-cream/30 border-[#F5E6E8]" required />
                </div>
              </div>

              {isLogin && (
                <div className="flex justify-end mt-2">
                  <button type="button" className="text-xs text-rosegold hover:underline">Esqueceu a senha?</button>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full coquette-button py-3.5 mt-4 disabled:opacity-70">
                {loading ? 'Aguarde...' : isLogin ? 'Entrar no Painel' : 'Criar Conta'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-mauve">
              {isLogin ? (
                <p>Ainda não tem uma conta? <button onClick={() => setIsLogin(false)} className="text-rosegold font-bold hover:underline">Cadastre-se</button></p>
              ) : (
                <p>Já possui uma conta? <button onClick={() => setIsLogin(true)} className="text-rosegold font-bold hover:underline">Faça Login</button></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
