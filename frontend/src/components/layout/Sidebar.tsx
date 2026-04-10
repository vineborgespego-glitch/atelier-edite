import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Scissors, Users, Settings, ChevronLeft, ChevronRight, Archive } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

export default function Sidebar({ isOpen, toggle }: SidebarProps) {
  const location = useLocation();

  const links = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/orders', label: 'Pedidos', icon: Scissors },
    { to: '/app/orders/history', label: 'Histórico', icon: Archive },
    { to: '/app/clients', label: 'Clientes', icon: Users },
    { to: '/app/admin', label: 'Ajustes', icon: Settings },
  ];

  return (
    <aside className="h-full bg-white border-r border-[#F5E6E8] flex flex-col items-center py-6 shadow-sm relative">
      <div className={`flex items-center justify-center w-full mb-10 ${isOpen ? 'px-6' : 'px-2'}`}>
        {isOpen ? (
          <h1 className="font-display font-bold text-2xl text-rosegold tracking-tight">Atelier Édite 🎀</h1>
        ) : (
          <div className="w-10 h-10 rounded-full bg-blush flex items-center justify-center text-rosegold font-display font-bold text-xl">
            AÉ
          </div>
        )}
      </div>

      <nav className="flex-1 w-full px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center py-3 px-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-blush/50 text-rosegold font-medium' 
                  : 'text-mauve hover:bg-cream hover:text-rosegold'
                }
              `}
              title={!isOpen ? link.label : undefined}
            >
              <Icon size={22} className={isActive ? 'text-rosegold' : 'text-mauve group-hover:text-rosegold'} />
              {isOpen && <span className="ml-3 text-sm">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <button 
        onClick={toggle}
        className="absolute -right-3 top-8 bg-white border border-[#F5E6E8] text-mauve hover:text-rosegold rounded-full p-1 shadow-sm transition-colors"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <div className={`mt-auto w-full px-4 pb-4 flex flex-col ${isOpen ? 'items-start' : 'items-center'}`}>
        <div className={`w-full bg-cream/50 rounded-xl p-3 flex items-center space-x-3 mt-4 ${!isOpen && 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-rosegold text-white flex items-center justify-center flex-shrink-0 text-sm">
            M
          </div>
          {isOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-dark truncate">Maria</p>
              <p className="text-xs text-mauve truncate">Proprietária</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
