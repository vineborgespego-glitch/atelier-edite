/**
 * Resposta automática fora do horário de atendimento.
 * Janela fixa em código de propósito — vira configurável quando a Maria pedir.
 */
import { prisma } from '../lib/prisma';
import { sendAuto } from './waAuto';
import { isBusinessHours } from './businessHours';
import { OFF_HOURS_TEXT } from './waTemplates';

/** Não repete a resposta automática pro mesmo contato dentro desta janela. */
const COOLDOWN_HORAS = 12;

/**
 * Responde uma mensagem recebida se estivermos fora do horário e o contato
 * ainda não tiver recebido o aviso nas últimas COOLDOWN_HORAS.
 */
export async function replyIfOffHours(userId: string, contactId: string, phone: string, at = new Date()) {
  if (isBusinessHours(at)) return;

  const desde = new Date(at.getTime() - COOLDOWN_HORAS * 60 * 60 * 1000);
  const jaAvisado = await prisma.waMessage.findFirst({
    where: { contactId, direction: 'OUT', msgType: 'auto_offhours', createdAt: { gte: desde } },
    select: { id: true },
  });
  if (jaAvisado) return;

  await sendAuto(userId, phone, OFF_HOURS_TEXT, 'auto_offhours');
}
