import { Scissors, CalendarHeart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream font-body selection:bg-rosegold selection:text-white">
      {/* Navigation */}
      <nav className="w-full glass-header py-4 px-6 fixed top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-display font-bold text-2xl text-rosegold tracking-tight">Atelier Edite Borges</div>
          <div>
            <Link to="/login" className="text-dark hover:text-rosegold transition-colors font-medium">Entrar</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-display font-bold text-dark leading-tight mb-6">
          Do caderninho para o <span className="text-transparent bg-clip-text bg-gradient-to-r from-rosegold to-accent italic pr-2">digital</span> com toda a moda.
        </h1>
        <p className="text-lg text-mauve mb-10 max-w-xl mx-auto">
          O sistema de gestão feito sob medida para ateliês de costura.
        </p>
        <div className="flex flex-col justify-center items-center space-y-4">
          <Link to="/login" className="coquette-button text-lg px-12 py-4 w-full sm:w-auto shadow-lg hover:shadow-xl hover:shadow-rosegold/20 ring-4 ring-white ring-offset-2 ring-offset-[#FEF2ED]">
            Entrar
          </Link>
          <Link to="/login" className="text-mauve hover:text-rosegold font-medium transition-colors py-2 underline decoration-rosegold/30 underline-offset-4">
            Ainda não tem uma conta? Criar Minha Conta
          </Link>
        </div>
        
        {/* Decorative Element */}
        <div className="mt-16 text-rosegold/60 text-2xl">
          🎀 —————— ✂️ —————— 🎀
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white border-y border-[#F5E6E8]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-dark mb-4">Feito para o Chão de Fábrica</h2>
            <p className="text-mauve max-w-xl mx-auto">Humanizamos a tecnologia para que a transição do manual para o digital seja natural, rápida e linda.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-cream border border-[#F5E6E8] hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-rosegold shadow-sm mb-6">
                <Scissors size={24} />
              </div>
              <h3 className="text-xl font-display font-bold text-dark mb-3">Pipeline Visual (Kanban)</h3>
              <p className="text-mauve text-sm leading-relaxed">Acompanhe seus pedidos em tempo real. Movimente peças do 'Recebido' até 'Entregue' com um visual limpo e cores inspiradoras.</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FDE8ED]/50 border border-[#F5E6E8] hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-rosegold shadow-sm mb-6">
                <CalendarHeart size={24} />
              </div>
              <h3 className="text-xl font-display font-bold text-dark mb-3">CRM de Clientes</h3>
              <p className="text-mauve text-sm leading-relaxed">Salve o histórico de medidas de cada cliente, anotações de preferências corporais e mantenha tudo organizado.</p>
            </div>

            <div className="p-8 rounded-3xl bg-[#FEF2ED] border border-[#F5E6E8] hover:-translate-y-1 transition-transform">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-rosegold shadow-sm mb-6">
                <Sparkles size={24} />
              </div>
              <h3 className="text-xl font-display font-bold text-dark mb-3">Recibos & WhatsApp</h3>
              <p className="text-mauve text-sm leading-relaxed">Emita recibos profissionais com valor por extenso em PDF. Notifique clientes pelo WhatsApp quando a peça estiver pronta.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white/80 py-12 px-6 text-center font-display">
        <div className="text-rosegold font-bold text-2xl mb-4">Atelier Edite Borges</div>
        <p className="text-sm">Humanizando a tecnologia na moda sob medida.</p>
        <div className="mt-8 text-white/40 text-sm">© 2026 Atelier Edite Borges. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
