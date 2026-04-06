import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';

export default function Receipts() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipts() {
      try {
        const response = await api.get('/receipts');
        const formatted = response.data.receipts.map((rec: any) => ({
          id: rec.receiptNumber,
          date: format(new Date(rec.issuedAt), 'dd/MM/yyyy'),
          client: rec.order?.client?.name || 'Cliente Deletada',
          amount: `R$ ${Number(rec.totalAmount).toFixed(2).replace('.', ',')}`,
          status: 'Gerado',
          pdfPath: rec.pdfPath
        }));
        setReceipts(formatted);
      } catch (error) {
        console.error('Erro ao carregar recibos:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReceipts();
  }, []);

  const handleDownload = (pdfPath: string) => {
    const url = `${import.meta.env.VITE_API_URL}${pdfPath}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="mb-8 border-b border-[#F5E6E8] pb-6">
        <h1 className="text-3xl font-display font-bold text-dark">Recibos Emitidos</h1>
        <p className="text-mauve mt-1">Histórico completo de todos os comprovantes profissionais gerados (PDF).</p>
      </header>

      <div className="coquette-card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-mauve">Carregando recibos...</div>
        ) : receipts.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center">
            <FileText size={48} className="text-[#E8D5D7] mb-4" />
            <h3 className="text-lg font-medium text-dark mb-1">Nenhum recibo ainda</h3>
            <p className="text-mauve text-sm mb-4">Você ainda não gerou nenhum comprovante em PDF.</p>
            <p className="text-rosegold text-xs">Vá até o Kanban de Pedidos para gerar o seu primeiro! 🎀</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blush/30 border-b border-[#F5E6E8]">
                <th className="p-4 font-display font-semibold text-dark">Número</th>
                <th className="p-4 font-display font-semibold text-dark">Data Emissão</th>
                <th className="p-4 font-display font-semibold text-dark">Cliente</th>
                <th className="p-4 font-display font-semibold text-dark">Valor Total</th>
                <th className="p-4 font-display font-semibold text-dark text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((rec, i) => (
                <tr key={rec.id} className={`border-b border-[#F5E6E8] hover:bg-cream/50 transition-colors ${i === receipts.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="p-4 font-medium text-rosegold flex items-center">
                    <FileText size={16} className="mr-2" />
                    {rec.id}
                  </td>
                  <td className="p-4 text-dark">{rec.date}</td>
                  <td className="p-4 text-dark font-medium">{rec.client}</td>
                  <td className="p-4 font-medium text-emerald-700">{rec.amount}</td>
                  <td className="p-4 text-right flex justify-end space-x-2">
                    <button 
                      onClick={() => handleDownload(rec.pdfPath)}
                      className="text-mauve hover:text-rosegold border border-[#E8D5D7] hover:border-rosegold rounded-lg p-2 transition-all flex items-center bg-white" 
                      title="Visualizar Recibo"
                    >
                      <ExternalLink size={16} className="mr-1" />
                      Visualizar
                    </button>
                    <button 
                      onClick={() => handleDownload(rec.pdfPath)}
                      className="text-white hover:bg-rosegold border border-[#E8D5D7] bg-rosegold/90 rounded-lg p-2 transition-all" 
                      title="Baixar PDF"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
