import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';

/**
 * Transcrição de áudios do WhatsApp via OpenAI (Whisper).
 * Requer OPENAI_API_KEY no ambiente. Sem a chave, os áudios ficam
 * salvos em disco com o marcador — transcreve depois quando configurar.
 */

const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = process.env.TRANSCRIPTION_MODEL || 'whisper-1';

export async function transcribeAudioFile(messageId: string, mediaPath: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return; // sem chave, deixa pendente

  const fullPath = path.resolve(process.cwd(), mediaPath);
  if (!fs.existsSync(fullPath)) return;

  const buffer = fs.readFileSync(fullPath);
  const form = new FormData();
  form.append('model', MODEL);
  form.append('language', 'pt');
  form.append('file', new Blob([buffer], { type: 'audio/ogg' }), 'audio.ogg');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    const json: any = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || `HTTP ${res.status}`);
    }

    const text = (json.text || '').trim();
    if (text) {
      await prisma.waMessage.update({
        where: { id: messageId },
        data: { transcription: text },
      });
    }
  } finally {
    clearTimeout(timeout);
  }
}

/** Reprocessa áudios sem transcrição (falhas passadas / chave configurada depois). */
export async function transcribePending(limit = 10): Promise<number> {
  if (!process.env.OPENAI_API_KEY) return 0;

  const pending = await prisma.waMessage.findMany({
    where: { msgType: 'audio', transcription: null, mediaPath: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, mediaPath: true },
  });

  let done = 0;
  for (const msg of pending) {
    try {
      await transcribeAudioFile(msg.id, msg.mediaPath!);
      done++;
    } catch (err: any) {
      console.error(`[WA] Retry de transcrição falhou (${msg.id}):`, err?.message || err);
    }
  }
  return done;
}

/** Agenda o retry periódico de transcrições pendentes (a cada 10 min). */
export function startTranscriptionWorker() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[WA] OPENAI_API_KEY ausente — transcrição de áudios desativada.');
    return;
  }
  setInterval(() => {
    transcribePending().catch((err) => console.error('[WA] Worker de transcrição:', err));
  }, 10 * 60 * 1000);
}
