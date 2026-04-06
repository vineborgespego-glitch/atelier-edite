import PDFDocument from 'pdfkit';
import { Order, OrderItem, Client, User } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Helper for 'valor por extenso' (simplificado para o exemplo)
function numeroPorExtenso(valor: number): string {
  // Uma biblioteca real como 'numero-por-extenso' seria ideal,
  // mas aqui faremos uma versão simples/mockada em respeito às constraints do ambiente
  return `${valor.toFixed(2).replace('.', ',')} (valor por extenso)`;
}

export async function generateReceiptPDF(
  order: Order & { items: OrderItem[]; client: Client; user: User },
  receiptNumber: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Custom Page Size: 80mm width (226.77 points), height flexible (e.g. 600 points)
      const doc = new PDFDocument({ 
        size: [226.77, 600], // 80mm wide
        margin: 15 
      });
      const fileName = `receipt-${receiptNumber}.pdf`;
      
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);

      // --- HEADER ---
      doc.fontSize(14).font('Courier-Bold').text('EDITE BORGES', { align: 'center' });
      doc.fontSize(8).font('Courier').text('ATELIER DE COSTURA', { align: 'center' });
      doc.moveDown(0.5);
      doc.text('----------------------------------', { align: 'center' });
      doc.moveDown(0.5);

      // --- ORDER INFO ---
      doc.fontSize(9).font('Courier');
      doc.text(`PEDIDO: #${order.orderNumber.split('-').pop() || order.id.slice(-4)}`);
      doc.text(`DATA: ${order.createdAt.toLocaleDateString('pt-BR')}`);
      doc.text(`CLIENTE: ${order.client.name.toUpperCase()}`);
      doc.moveDown(0.5);
      doc.text('----------------------------------');
      doc.moveDown(0.5);

      // --- ITEMS ---
      order.items.forEach(item => {
        const qty = Number(item.quantity);
        const subtotal = Number(item.subtotal).toFixed(2).replace('.', ',');
        doc.text(`${qty}x ${item.description.slice(0, 20)}`, { continued: true });
        doc.text(` R$ ${subtotal}`, { align: 'right' });
      });
      doc.moveDown(0.5);
      doc.text('----------------------------------');
      
      // --- TOTAL ---
      doc.moveDown(0.5);
      doc.fontSize(12).font('Courier-Bold').text('TOTAL:', { continued: true });
      doc.text(` R$ ${Number(order.totalAmount).toFixed(2).replace('.', ',')}`, { align: 'right' });
      doc.moveDown(1);

      // --- STATUS BOX (PAGO) ---
      if (order.paidAt) {
        const currentY = doc.y;
        doc.rect(20, currentY, 187, 25).stroke();
        doc.fontSize(10).text('*** PAGO ***', 20, currentY + 8, { align: 'center', width: 187 });
        doc.moveDown(1.5);
        
        const methodMap: any = {
          'CASH': 'DINHEIRO',
          'PIX': 'PIX',
          'CREDIT_CARD': 'CARTÃO CRÉDITO',
          'DEBIT_CARD': 'CARTÃO DÉBITO'
        };
        const method = methodMap[order.paymentMethod || ''] || 'OUTRO';
        doc.fontSize(8).font('Courier').text(`FORMA: ${method}`, { align: 'center' });
        doc.moveDown(1);
      }

      // --- PICKUP BOX ---
      const pickupY = doc.y;
      doc.rect(20, pickupY, 187, 40).stroke();
      const dueDateStr = order.dueDate ? order.dueDate.toLocaleDateString('pt-BR') : 'A Combinar';
      doc.fontSize(8).font('Courier').text('PREVISÃO DE RETIRADA:', 20, pickupY + 8, { align: 'center', width: 187 });
      doc.fontSize(12).font('Courier-Bold').text(dueDateStr, 20, pickupY + 22, { align: 'center', width: 187 });
      doc.moveDown(4.5);

      // --- INSTRUÇÕES (EXATO DA IMAGEM) ---
      doc.fillColor('#000000');
      doc.fontSize(9).font('Courier-Bold').text('Instruções', { align: 'center', underline: true });
      doc.moveDown(0.5);
      doc.fontSize(7).font('Courier');
      doc.text('1 - O pagamento pode ser realizado via PIX, em dinheiro ou no cartão à vista.', { align: 'center', width: 187 });
      doc.moveDown(0.4);
      doc.text('2 - Caso o pedido não seja retirado em até 3 meses, ele poderá ser vendido, configurando desistência por parte do cliente.', { align: 'center', width: 187 });
      doc.moveDown(0.4);
      doc.text('3 - O prazo para reconserto é de 15 dias após a data de entrega.', { align: 'center', width: 187 });
      doc.moveDown(0.4);
      doc.text('4 - Em casos onde o cliente trouxer a peça já marcada, não será realizado reconserto.', { align: 'center', width: 187 });
      doc.moveDown(1.5);

      // --- CONTATO E LOCALIZAÇÃO ---
      doc.fontSize(9).font('Courier-Bold').text('Contato e Localização', { align: 'center', underline: true });
      doc.fontSize(7).font('Courier');
      doc.text('Endereço: Desembargador Otávio do Amaral, 547 - Bigorrilho', { align: 'center' });
      doc.text('Horário de Funcionamento: Segunda à Sexta: 09:00 - 18:00', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Courier-Bold').text('(41) 99593-7861 PIX', { align: 'center' });
      doc.fontSize(7).font('Courier');
      doc.text('Instagram: @borgesmariaedite', { align: 'center' });
      doc.moveDown(1.5);

      // --- FOOTER ---
      doc.fontSize(7).font('Courier').text('OBRIGADO PELA PREFERENCIA!', { align: 'center' });
      doc.text('DEUS ABENÇOE SEU DIA.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(`/uploads/${fileName}`);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}
