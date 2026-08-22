import { Menu, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TopbarProps {
  toggleSidebar: () => void;
  pendentes: number;
}

export default function Topbar({ toggleSidebar, pendentes }: TopbarProps) {
  return (
    <header className="glass-header h-16 w-full flex items-center justify-between px-4 md:px-8 z-10">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-mauve hover:text-rosegold p-2 -ml-2 mr-2"
        >
          <Menu size={24} />
        </button>
      </div>

      <div className="flex items-center space-x-4">
        {/* Some quando a fila está vazia: aviso que fica sempre na tela vira paisagem. */}
        {pendentes > 0 && (
          <Link
            to="/app/a-enviar"
            title="Ver a fila de aprovação"
            className="flex items-center gap-2 rounded-full bg-rosegold text-white text-xs font-medium pl-3 pr-4 py-1.5 shadow-soft hover:bg-accent transition-colors"
          >
            <Send size={14} />
            <span>
              {pendentes} {pendentes === 1 ? 'mensagem aguardando' : 'mensagens aguardando'}
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
