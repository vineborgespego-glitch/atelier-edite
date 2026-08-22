import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

/**
 * Descrição de imagens do WhatsApp via OpenAI (visão).
 * Mesma ideia do Whisper para áudio: a foto vira texto no campo `transcription`,
 * então a busca acha e a IA da fase 2 lê o histórico inteiro sem pontos cegos.
 * Sem OPENAI_API_KEY, a imagem fica salva e é descrita depois.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.VISION_MODEL || 'gpt-4o-mini';

const PROMPT =
  'Você trabalha em um atelier de costura e está descrevendo uma foto que uma cliente ' +
  'mandou no WhatsApp. Descreva em português, em no máximo 3 frases, o que aparece: ' +
  'peça de roupa, tecido, cor, detalhes, defeito ou ajuste apontado, medida ou etiqueta. ' +
  'Se a imagem for um print de conversa ou um documento, transcreva o texto que aparece. ' +
  'Não invente nada que não dê para ver.';

function mimeFromPath(p: string): string {
  const ext = path.extname(p).toLowerCase().replace('.', '');
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export async function describeImageFile(messageId: string, mediaPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return; // sem chave, deixa pendente

  const fullPath = path.resolve(process.cwd(), mediaPath);
  if (!fs.existsSync(fullPath)) return;

  const dataUrl = `data:${mimeFromPath(mediaPath)};base64,${fs.readFileSync(fullPath).toString('base64')}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    const json: any = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || `HTTP ${res.status}`);
    }

    const texto = (json.choices?.[0]?.message?.content || '').trim();
    if (texto) {
      await prisma.waMessage.update({ where: { id: messageId }, data: { transcription: texto } });
    }
  } finally {
    clearTimeout(timeout);
  }
}

/** Reprocessa imagens sem descrição (falhas passadas / chave configurada depois). */
export async function describePending(limit = 10): Promise<number> {
  if (!process.env.OPENAI_API_KEY) return 0;

  const pending = await prisma.waMessage.findMany({
    // Só o que a cliente mandou: descrever a foto que nós enviamos é gastar à toa.
    where: { msgType: 'image', direction: 'IN', transcription: null, mediaPath: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, mediaPath: true },
  });

  let done = 0;
  for (const msg of pending) {
    try {
      await describeImageFile(msg.id, msg.mediaPath!);
      done++;
    } catch (err: any) {
      console.error(`[WA] Retry de descrição de imagem falhou (${msg.id}):`, err?.message || err);
    }
  }
  return done;
}

/** Agenda o retry periódico de imagens pendentes (a cada 10 min). */
export function startVisionWorker() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[WA] OPENAI_API_KEY ausente — descrição de imagens desativada.');
    return;
  }
  setInterval(() => {
    describePending().catch((err) => console.error('[WA] Worker de visão:', err));
  }, 10 * 60 * 1000);
}
