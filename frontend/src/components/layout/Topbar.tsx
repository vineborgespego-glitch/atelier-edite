import { Bell, Search, Menu } from 'lucide-react';

interface TopbarProps {
  toggleSidebar: () => void;
}

export default function Topbar({ toggleSidebar }: TopbarProps) {
  return (
    <header className="glass-header h-16 w-full flex items-center justify-between px-4 md:px-8 z-10">
      <div className="flex items-center">
        <button 
          onClick={toggleSidebar}
          className="md:hidden text-mauve hover:text-rosegold p-2 -ml-2 mr-2"
        >
          <Menu size={24} />
        </button>

        <div className="relative hidden md:flex items-center">
          <Search size={18} className="absolute left-3 text-mauve" />
          <input 
            type="text" 
            placeholder="Buscar pedidos, clientes..." 
            className="bg-white border border-[#E8D5D7] rounded-full pl-10 pr-4 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-accent w-64 transition-all focus:w-80"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-mauve hover:text-rosegold transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rosegold rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
