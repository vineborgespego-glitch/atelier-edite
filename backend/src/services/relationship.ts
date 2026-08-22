/**
 * Jobs de relacionamento: aniversário e reativação de cliente sumida.
 * Nenhum dos dois envia nada — os dois ENFILEIRAM para a Maria aprovar.
 */
import { prisma } from '../lib/prisma';
import { queueMessage, alreadyQueued } from './waOutbox';
import { birthdayTemplate, reactivationTemplate } from './waTemplates';
import { ehAniversarioHoje, ultimoContato } from './relationshipRules';

/** Cliente é considerada sumida depois disso (sem pedido E sem conversa). */
const DIAS_SUMIDA = 90;
/** Não oferecer reativação de novo antes disso. */
const DIAS_ENTRE_REATIVACOES = 180;
/** Teto por dia: sem isso a primeira rodada joga centenas de itens na tela. */
const MAX_REATIVACOES_DIA = 20;

/** Já mandamos (ou já enfileiramos) esse tipo para este telefone há pouco? */
async function jaFalamos(userId: string, phone: string, msgType: string, dias: number): Promise<boolean> {
  if (await alreadyQueued(userId, phone, msgType)) return true;
  const desde = new Date(Date.now() - dias * 86400000);
  const enviado = await prisma.waOutbox.findFirst({
    where: { userId, phone, msgType, status: 'SENT', sentAt: { gte: desde } },
    select: { id: true },
  });
  return !!enviado;
}

export async function runBirthdays(at = new Date()) {
  // Desligado por padrão: o campo de aniversário já é coletado no cadastro,
  // mas a mensagem só passa a ser gerada quando a Maria quiser — basta
  // BIRTHDAY_MESSAGES=on no ambiente. Nada aqui envia: só enfileira pra aprovação.
  if (process.env.BIRTHDAY_MESSAGES !== 'on') return;

  try {
    // Comparar mês/dia direto no Postgres exige SQL cru por causa do timezone.
    // São algumas centenas de clientes, uma vez por dia — filtrar aqui é mais barato que a complexidade.
    const clients = await prisma.client.findMany({
      where: { birthDate: { not: null }, phone: { not: null }, archivedAt: null },
      select: { id: true, userId: true, name: true, phone: true, birthDate: true },
    });

    let fila = 0;
    for (const c of clients) {
      if (!ehAniversarioHoje(c.birthDate!, at)) continue;
      // 300 dias: pega o aniversário do ano que vem, mas nunca duas vezes no mesmo.
      if (await jaFalamos(c.userId, c.phone!.replace(/\D/g, ''), 'auto_birthday', 300)) continue;

      await queueMessage(c.userId, c.phone!, birthdayTemplate(c.name), 'auto_birthday', c.id);
      fila++;
    }

    if (fila) console.log(`[Birthday] ${fila} aniversariante(s) na fila de aprovação.`);
  } catch (error) {
    console.error('[Birthday] Erro:', error);
  }
}

export async function runReactivation(at = new Date()) {
  try {
    const limite = new Date(at.getTime() - DIAS_SUMIDA * 86400000);

    const clients = await prisma.client.findMany({
      where: { phone: { not: null }, archivedAt: null },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        waContacts: {
          select: { messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } },
        },
      },
    });

    let fila = 0;
    for (const c of clients) {
      if (fila >= MAX_REATIVACOES_DIA) break;

      // Conversa recente conta como contato — senão mandamos "estou com saudade"
      // para quem trocou mensagem ontem.
      const ultimaConversa = c.waContacts
        .flatMap((w) => w.messages)
        .map((m) => m.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const visto = ultimoContato(c.orders[0]?.createdAt || null, ultimaConversa || null);
      if (!visto || visto > limite) continue;

      if (await jaFalamos(c.userId, c.phone!.replace(/\D/g, ''), 'auto_reactivation', DIAS_ENTRE_REATIVACOES)) continue;

      await queueMessage(c.userId, c.phone!, reactivationTemplate(c.name), 'auto_reactivation', c.id);
      fila++;
    }

    if (fila) console.log(`[Reactivation] ${fila} cliente(s) na fila de aprovação.`);
  } catch (error) {
    console.error('[Reactivation] Erro:', error);
  }
}
