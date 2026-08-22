/**
 * Envio pela Evolution API v2 (Baileys).
 *   POST {EVOLUTION_URL}/{rota}/{INSTANCE_NAME}
 *   ex: message/sendText, chat/getBase64FromMediaMessage
 *   Header: apikey: {TOKEN_DA_INSTANCIA}   (não é "token" nem Bearer)
 * O check de `{ error }` no corpo é herança da Evolution GO (que devolvia erro
 * com HTTP 200). Custa nada e cobre gateway intermediário — mantido.
 */

export interface SendTextResult {
  ok: boolean;
  error?: string;
  data?: any;
}

/** Mídia grande vira base64 gordo — 60s aqui, contra os 30s do texto. */
const TIMEOUT_TEXTO = 30000;
const TIMEOUT_MIDIA = 60000;

async function post(rota: string, body: any, timeoutMs: number): Promise<SendTextResult> {
  const baseUrl = process.env.EVOLUTION_URL;
  const token = process.env.INSTANCE_TOKEN;
  const instance = process.env.INSTANCE_NAME;

  if (!baseUrl || !token || !instance) {
    return { ok: false, error: 'EVOLUTION_URL/INSTANCE_TOKEN/INSTANCE_NAME não configurados' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${baseUrl.replace(/\/$/, '')}/${rota}/${encodeURIComponent(instance)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: token },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // corpo não-JSON
    }

    if (!res.ok || (json && json.error)) {
      const detail = json?.response?.message || json?.error || json?.message;
      return { ok: false, error: detail ? JSON.stringify(detail) : `HTTP ${res.status}`, data: json };
    }

    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede ao enviar' };
  } finally {
    clearTimeout(timeout);
  }
}

/** Só dígitos; recusa o que claramente não é telefone antes de gastar request. */
function normalizeNumber(number: string): string | null {
  const clean = (number || '').replace(/\D/g, '');
  return clean.length >= 10 ? clean : null;
}

export async function sendText(number: string, text: string): Promise<SendTextResult> {
  const cleanNumber = normalizeNumber(number);
  if (!cleanNumber) return { ok: false, error: `Número inválido: ${number}` };

  return post('message/sendText', { number: cleanNumber, text }, TIMEOUT_TEXTO);
}

export type MediaType = 'image' | 'video' | 'document';

/** Imagem, vídeo ou documento. `media` é base64 puro (sem data:) ou uma URL. */
export async function sendMedia(
  number: string,
  media: string,
  opts: { mediatype: MediaType; mimetype: string; fileName?: string; caption?: string }
): Promise<SendTextResult> {
  const cleanNumber = normalizeNumber(number);
  if (!cleanNumber) return { ok: false, error: `Número inválido: ${number}` };

  return post(
    'message/sendMedia',
    {
      number: cleanNumber,
      mediatype: opts.mediatype,
      mimetype: opts.mimetype,
      media,
      fileName: opts.fileName || 'arquivo',
      caption: opts.caption || '',
    },
    TIMEOUT_MIDIA
  );
}

/**
 * Áudio como mensagem de voz (aquele balãozinho com onda).
 * Rota própria na Evolution — sendMedia mandaria como arquivo anexado.
 */
export async function sendAudio(number: string, audioBase64: string): Promise<SendTextResult> {
  const cleanNumber = normalizeNumber(number);
  if (!cleanNumber) return { ok: false, error: `Número inválido: ${number}` };

  return post('message/sendWhatsAppAudio', { number: cleanNumber, audio: audioBase64 }, TIMEOUT_MIDIA);
}

/**
 * Busca os bytes de uma mídia recebida. O webhook só traz base64 quando
 * WEBHOOK_BASE64 está ligado na Evolution — e nem toda versão respeita o
 * flag por instância. Aqui a mídia é pedida sob demanda, sem depender dele.
 */
export async function fetchMediaBase64(key: {
  remoteJid: string;
  id: string;
  fromMe: boolean;
}): Promise<string | null> {
  const res = await post('chat/getBase64FromMediaMessage', { message: { key } }, TIMEOUT_MIDIA);
  if (!res.ok) {
    console.error('[WA] Falha ao buscar mídia da Evolution:', res.error);
    return null;
  }
  return res.data?.base64 || null;
}
