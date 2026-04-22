import { Menu } from 'lucide-react';

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
          {/* Barra de busca removida (decorativa) */}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Ícone de notificações removido (decorativo) */}
      </div>
    </header>
  );
}
