/**
 * Ponto único de saída das mensagens automáticas.
 * Envia pela Evolution e, só se o envio deu certo, grava no histórico —
 * assim a inbox mostra exatamente o que o cliente recebeu.
 */
import { sendText } from './waSend';
import { recordOutgoing } from './waService';

export async function sendAuto(userId: string, phone: string, text: string, msgType: string) {
  const result = await sendText(phone, text);
  if (!result.ok) {
    console.error(`[WA] Falha ao enviar ${msgType} para ${phone}: ${result.error}`);
    return false;
  }
  try {
    await recordOutgoing(userId, phone, text, msgType);
  } catch (err: any) {
    // Já foi entregue ao cliente; falhar aqui só perde histórico.
    console.error('[WA] Enviado mas não registrado:', err?.message || err);
  }
  return true;
}
