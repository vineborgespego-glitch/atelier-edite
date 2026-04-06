import { Save, Store, Mail, Phone, MapPin } from 'lucide-react';

export default function Admin() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-dark">Configurações do Atelier</h1>
        <p className="text-mauve mt-1">Personalize os dados que aparecerão nos recibos e comunicações.</p>
      </header>

      <div className="coquette-card p-8">
        <h2 className="text-xl font-display font-semibold text-dark mb-6 border-b border-[#F5E6E8] pb-4">
          Identidade do Negócio
        </h2>
        
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">Nome do Atelier</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Store size={18} className="text-mauve" />
                </div>
                <input type="text" defaultValue="Atelier Édite" className="w-full pl-14 pr-4 py-3 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">CPF / CNPJ</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <input type="text" defaultValue="000.000.000-00" className="w-full px-4 py-3 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">E-mail de Contato</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Mail size={18} className="text-mauve" />
                </div>
                <input type="email" defaultValue="contato@atelieredite.com.br" className="w-full pl-14 pr-4 py-3 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-dark">Telefone / WhatsApp</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <Phone size={18} className="text-mauve" />
                </div>
                <input type="text" defaultValue="+55 11 98888-7777" className="w-full pl-14 pr-4 py-3 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-dark">Endereço Físico (Opcional)</label>
              <div className="relative border border-[#E8D5D7] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosegold transition-all">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none bg-cream px-3 border-r border-[#E8D5D7]">
                  <MapPin size={18} className="text-mauve" />
                </div>
                <input type="text" placeholder="Rua das Costureiras, 123" className="w-full pl-14 pr-4 py-3 focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button type="button" className="coquette-button flex items-center space-x-2">
              <Save size={18} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
