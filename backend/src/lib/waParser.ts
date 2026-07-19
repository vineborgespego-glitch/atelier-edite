/**
 * Parser dos webhooks MESSAGES_UPSERT da Evolution API.
 * Cobre os dois formatos: Evolution GO (whatsmeow, campos com Maiúsculas)
 * e Evolution clássica (Baileys, campos minúsculos).
 * Funções puras — sem banco, sem rede — para facilitar teste.
 */

export interface ParsedWaEvent {
  instanceName: string;
  chatJid: string;
  senderJid: string;
  senderAltJid: string;
  recipientAltJid: string;
  isFromMe: boolean;
  isGroup: boolean;
  pushName: string;
  waMessageId: string | null;
  /** Telefone (só dígitos) extraído de qualquer JID do evento, se houver */
  phone: string | null;
  /** LID (só dígitos) extraído de qualquer JID do evento, se houver */
  lid: string | null;
  content: string;
  msgType: string;
  /** Base64 de mídia (áudio), quando a Evolution envia */
  mediaBase64: string | null;
}

/** Remove sufixo de device (":xx") e o domínio, deixando só dígitos. */
export function cleanJid(jid?: string | null): string {
  if (!jid) return '';
  const beforeAt = jid.split('@')[0] || '';
  return beforeAt.split(':')[0].replace(/\D/g, '');
}

export function jidKind(jid?: string | null): 'phone' | 'lid' | 'other' {
  if (!jid) return 'other';
  if (jid.endsWith('@s.whatsapp.net')) return 'phone';
  if (jid.endsWith('@lid')) return 'lid';
  return 'other';
}

/** Só conversa individual: telefone ou LID. Descarta grupos, newsletter, status etc. */
export function isIndividualChat(jid?: string | null): boolean {
  const kind = jidKind(jid);
  return kind === 'phone' || kind === 'lid';
}

/** Desembrulha mensagens efêmeras / viewOnce até chegar na mensagem real. */
export function unwrapMessage(message: any): any {
  let m = message;
  let guard = 0;
  while (m && guard < 5) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else break;
    guard++;
  }
  return m || {};
}

/** Extrai texto/marcador e tipo. Retorna null se não há nada aproveitável. */
export function extractContent(rawMessage: any): { content: string; msgType: string } | null {
  const m = unwrapMessage(rawMessage);

  if (typeof m.conversation === 'string' && m.conversation.trim()) {
    return { content: m.conversation.trim(), msgType: 'text' };
  }
  if (m.extendedTextMessage?.text?.trim()) {
    return { content: m.extendedTextMessage.text.trim(), msgType: 'text' };
  }
  if (m.audioMessage) {
    const secs = Number(m.audioMessage.seconds || 0);
    return { content: `[áudio ${secs}s]`, msgType: 'audio' };
  }
  if (m.imageMessage) {
    const caption = (m.imageMessage.caption || '').trim();
    return { content: caption ? `[imagem] ${caption}` : '[imagem]', msgType: 'image' };
  }
  if (m.videoMessage) {
    const caption = (m.videoMessage.caption || '').trim();
    return { content: caption ? `[vídeo] ${caption}` : '[vídeo]', msgType: 'video' };
  }
  if (m.documentMessage) {
    const fileName = m.documentMessage.fileName || 'arquivo';
    return { content: `[documento: ${fileName}]`, msgType: 'document' };
  }
  if (m.stickerMessage) {
    return { content: '[figurinha]', msgType: 'sticker' };
  }
  if (m.locationMessage) {
    return { content: '[localização]', msgType: 'location' };
  }
  if (m.contactMessage || m.contactsArrayMessage) {
    return { content: '[contato]', msgType: 'contact' };
  }

  return null; // sem texto e sem marcador — descartar
}

/**
 * Normaliza o payload do webhook nos dois formatos.
 * Retorna null quando o evento não é uma conversa individual aproveitável.
 */
export function parseWebhookEvent(body: any): ParsedWaEvent | null {
  if (!body || typeof body !== 'object') return null;
  const data = body.data || {};

  // Evolution GO (whatsmeow) — campos com Maiúsculas
  const info = data.Info;
  // Evolution clássica (Baileys) — campos minúsculos
  const key = data.key;

  let chatJid = '';
  let senderJid = '';
  let senderAltJid = '';
  let recipientAltJid = '';
  let isFromMe = false;
  let isGroup = false;
  let pushName = '';
  let waMessageId: string | null = null;
  let rawMessage: any = null;

  if (info) {
    chatJid = info.Chat || '';
    senderJid = info.Sender || '';
    senderAltJid = info.SenderAlt || '';
    recipientAltJid = info.RecipientAlt || '';
    isFromMe = !!info.IsFromMe;
    isGroup = !!info.IsGroup;
    pushName = info.PushName || '';
    waMessageId = info.ID || null;
    rawMessage = data.Message;
  } else if (key) {
    chatJid = key.remoteJid || '';
    senderJid = key.participant || key.remoteJid || '';
    isFromMe = !!key.fromMe;
    isGroup = (key.remoteJid || '').endsWith('@g.us');
    pushName = data.pushName || '';
    waMessageId = key.id || null;
    rawMessage = data.message;
  } else {
    return null;
  }

  // Só conversa individual
  if (isGroup || !isIndividualChat(chatJid)) return null;

  const extracted = extractContent(rawMessage);
  if (!extracted) return null;

  // Extrai telefone e LID do CONTATO (nunca do dono da instância).
  // Mensagem do cliente (IN):  o contato está em Chat / Sender / SenderAlt.
  //   (RecipientAlt aqui é o DONO — não pode entrar, senão o telefone da
  //    dona vira chave de contato.)
  // Mensagem nossa (OUT/fromMe): o contato está em Chat / RecipientAlt.
  //   (Sender/SenderAlt aqui são o DONO.)
  const contactJids = isFromMe
    ? [chatJid, recipientAltJid]
    : [chatJid, senderJid, senderAltJid];

  let phone: string | null = null;
  let lid: string | null = null;
  for (const jid of contactJids) {
    const kind = jidKind(jid);
    const digits = cleanJid(jid);
    if (!digits) continue;
    if (kind === 'phone' && !phone) phone = digits;
    if (kind === 'lid' && !lid) lid = digits;
  }

  const mediaBase64: string | null =
    (rawMessage && rawMessage.base64) || data.base64 || body.base64 || null;

  return {
    instanceName: body.instanceName || body.instance || data.instanceName || '',
    chatJid,
    senderJid,
    senderAltJid,
    recipientAltJid,
    isFromMe,
    isGroup,
    pushName,
    waMessageId,
    phone,
    lid,
    content: extracted.content,
    msgType: extracted.msgType,
    mediaBase64,
  };
}
