/**
 * Fila de aprovação. Quem quer falar com a cliente não envia — enfileira.
 * A Maria revisa (e edita, se quiser) e só então a mensagem sai.
 * Exceção combinada: aviso de pedido novo e de pedido pronto vão direto
 * pelo sendAuto, sem passar por aqui.
 */
import { prisma } from '../lib/prisma';
import { sendAuto } from './waAuto';

/** Intervalo entre envios numa aprovação em lote. Rajada do mesmo número
 *  é o padrão que o WhatsApp usa para banir — 40s deixa parecido com gente. */
const INTERVALO_MS = 40000;

export async function queueMessage(
  userId: string,
  phone: string,
  content: string,
  msgType: string,
  clientId?: string | null
) {
  const key = (phone || '').replace(/\D/g, '');
  if (!key) return null;

  return prisma.waOutbox.create({
    data: { userId, phone: key, content, msgType, clientId: clientId || null },
  });
}

/** Já existe algo pendente do mesmo tipo para esta cliente? Evita duplicar
 *  quando o job roda de novo antes da Maria aprovar. */
export async function alreadyQueued(userId: string, phone: string, msgType: string): Promise<boolean> {
  const key = (phone || '').replace(/\D/g, '');
  if (!key) return false;
  const hit = await prisma.waOutbox.findFirst({
    where: { userId, phone: key, msgType, status: 'PENDING' },
    select: { id: true },
  });
  return !!hit;
}

/**
 * Envia um item aprovado. `content` permite a Maria ter editado o texto.
 * Falhou? volta a PENDING com o erro registrado, para ela tentar de novo.
 */
export async function approveAndSend(userId: string, id: string, content?: string) {
  const item = await prisma.waOutbox.findFirst({ where: { id, userId, status: 'PENDING' } });
  if (!item) return { ok: false, error: 'Item não encontrado ou já processado' };

  const texto = (content || item.content).trim();
  if (!texto) return { ok: false, error: 'Mensagem vazia' };

  const enviou = await sendAuto(userId, item.phone, texto, item.msgType);
  if (!enviou) {
    await prisma.waOutbox.update({
      where: { id },
      data: { content: texto, error: 'Falha no envio — tente de novo' },
    });
    return { ok: false, error: 'Falha ao enviar pela Evolution' };
  }

  await prisma.waOutbox.update({
    where: { id },
    data: { content: texto, status: 'SENT', sentAt: new Date(), error: null },
  });
  return { ok: true };
}

export async function reject(userId: string, id: string) {
  const item = await prisma.waOutbox.findFirst({ where: { id, userId, status: 'PENDING' } });
  if (!item) return { ok: false, error: 'Item não encontrado ou já processado' };
  await prisma.waOutbox.update({ where: { id }, data: { status: 'REJECTED' } });
  return { ok: true };
}

/**
 * Aprova vários de uma vez, espaçando os envios. Roda em background: a tela
 * responde na hora e vai vendo os itens saírem de PENDING conforme atualiza.
 */
export function approveManyInBackground(userId: string, ids: string[]) {
  let i = 0;
  const proximo = async () => {
    if (i >= ids.length) return;
    const id = ids[i++];
    try {
      await approveAndSend(userId, id);
    } catch (err: any) {
      console.error('[Outbox] Falha no envio em lote:', err?.message || err);
    }
    if (i < ids.length) setTimeout(proximo, INTERVALO_MS);
  };
  // ponytail: fila em memória; se o processo cair no meio, o que sobrou
  // continua PENDING e a Maria aprova de novo — nada se perde.
  proximo();
}
