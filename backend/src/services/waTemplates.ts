/**
 * Textos das mensagens automáticas. Funções puras — dá pra testar sem banco.
 * REGRA DO PROJETO: sem emojis (o WhatsApp Desktop no Windows corrompe).
 * Acentos podem.
 */

const ATELIER = 'Atelier Edite';
const REVIEW_URL = 'https://www.google.com/maps?cid=18089226519185099016';

export interface TemplateOrder {
  title: string;
  dueDate: Date | string | null;
}

/** Primeiro nome, para a mensagem não ficar com o nome completo do cadastro. */
export function firstName(name?: string | null): string {
  const first = (name || '').trim().split(/\s+/)[0];
  return first || 'tudo bem';
}

function formatDate(d: Date | string | null): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}

/**
 * Mensagem para uma mudança de status. Retorna null quando aquele status
 * não avisa ninguém (DELIVERED, PAID, DRAFT, CANCELLED, ARCHIVED...).
 */
export function statusTemplate(status: string, order: TemplateOrder, clientName?: string | null): string | null {
  const nome = firstName(clientName);

  if (status === 'CONFIRMED') {
    const prazo = formatDate(order.dueDate);
    return (
      `Oi ${nome}, aqui é o ${ATELIER}. Recebemos seu pedido "${order.title}" e já entrou na nossa fila.` +
      (prazo ? ` Previsão de entrega: ${prazo}.` : '') +
      ` Qualquer dúvida é só chamar por aqui.`
    );
  }

  if (status === 'READY') {
    return (
      `Oi ${nome}, seu pedido "${order.title}" está pronto! ` +
      `Pode passar no atelier para retirar quando for melhor para você.`
    );
  }

  return null;
}

export function postSaleTemplate(order: TemplateOrder, clientName?: string | null): string {
  const nome = firstName(clientName);
  return (
    `Oi ${nome}, aqui é a Edite. Faz alguns dias que você retirou o pedido "${order.title}". ` +
    `Ficou tudo do jeito que você queria? Se puder deixar sua avaliação, ajuda muito o atelier: ${REVIEW_URL}`
  );
}

/** Legenda do PDF do recibo enviado pelo WhatsApp. */
export function receiptCaption(clientName?: string | null): string {
  return (
    `Oi ${firstName(clientName)}, segue o comprovante do seu pedido no ${ATELIER}. ` +
    `Qualquer dúvida é só me chamar por aqui.`
  );
}

export function birthdayTemplate(clientName?: string | null): string {
  return (
    `Oi ${firstName(clientName)}, feliz aniversário! Todo mundo aqui do ${ATELIER} ` +
    `deseja um dia lindo para você. Obrigada por confiar no nosso trabalho.`
  );
}

export function reactivationTemplate(clientName?: string | null): string {
  return (
    `Oi ${firstName(clientName)}, aqui é a Edite. Faz um tempinho que a gente não se fala ` +
    `e fiquei com saudade. Se precisar de algum ajuste ou tiver uma peça em mente, ` +
    `é só me chamar por aqui que a gente dá um jeito.`
  );
}

export const OFF_HOURS_TEXT =
  `Oi! Aqui é o ${ATELIER}. Recebi sua mensagem, mas estamos fora do horário de atendimento agora. ` +
  `Respondo assim que abrirmos (segunda a sexta das 9h às 18h). ` +
  `Se for urgente, me conte aqui mesmo que eu já vejo pela manhã.`;
