import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ParsedWaEvent } from '../lib/waParser';
import { transcribeAudioFile } from './waTranscription';

const AUDIO_DIR = path.resolve(process.cwd(), 'uploads', 'wa-audio');

/** Compara telefones por dígitos, tolerante a 55/DDD/9º dígito ausentes. */
export function phonesMatch(a?: string | null, b?: string | null): boolean {
  const da = (a || '').replace(/\D/g, '');
  const db = (b || '').replace(/\D/g, '');
  if (da.length < 8 || db.length < 8) return false;
  return da.endsWith(db.slice(-8)) && db.endsWith(da.slice(-8));
}

/** Acha o cliente do CRM cujo telefone bate com o do contato WhatsApp. */
async function findMatchingClientId(userId: string, phone: string): Promise<string | null> {
  const clients = await prisma.client.findMany({
    where: { userId, phone: { not: null } },
    select: { id: true, phone: true },
  });
  const match = clients.find((c) => phonesMatch(c.phone, phone));
  return match?.id || null;
}

/**
 * Vincula contatos WhatsApp órfãos a um cliente recém criado/editado.
 * Chamado pelos hooks em clients.routes.
 */
export async function linkContactsForClient(userId: string, clientId: string, clientPhone?: string | null) {
  if (!clientPhone) return;
  const orphans = await prisma.waContact.findMany({
    where: { userId, clientId: null },
    select: { id: true, phone: true },
  });
  const matches = orphans.filter((c) => phonesMatch(c.phone, clientPhone));
  if (matches.length) {
    await prisma.waContact.updateMany({
      where: { id: { in: matches.map((m) => m.id) } },
      data: { clientId },
    });
  }
}

/**
 * Resolve a chave do contato aplicando as regras de LID:
 * - aprende o de-para lid→phone quando os dois vêm juntos
 * - telefone é SEMPRE a chave preferida
 * - se só veio LID, tenta o mapa; senão usa o LID temporariamente
 * Retorna a chave e, se houve aprendizado novo, funde registro-LID → telefone.
 */
async function resolveContactKey(userId: string, phone: string | null, lid: string | null): Promise<string | null> {
  // Aprende o par
  if (phone && lid) {
    await prisma.waLidMap.upsert({
      where: { lid },
      update: { phone },
      create: { lid, phone },
    });
    await mergeLidContactIntoPhone(userId, lid, phone);
    return phone;
  }

  if (phone) return phone;

  if (lid) {
    const known = await prisma.waLidMap.findUnique({ where: { lid } });
    if (known) {
      await mergeLidContactIntoPhone(userId, lid, known.phone);
      return known.phone;
    }
    return lid; // temporário, até o telefone aparecer
  }

  return null;
}

/** Migra mensagens do registro-LID temporário para o registro-telefone e apaga o duplicado. */
async function mergeLidContactIntoPhone(userId: string, lid: string, phone: string) {
  const lidContact = await prisma.waContact.findUnique({
    where: { userId_phone: { userId, phone: lid } },
  });
  if (!lidContact) return;

  const phoneContact = await prisma.waContact.findUnique({
    where: { userId_phone: { userId, phone } },
  });

  if (!phoneContact) {
    // Só renomeia a chave do registro
    await prisma.waContact.update({
      where: { id: lidContact.id },
      data: { phone },
    });
    return;
  }

  // Os dois existem: migra as mensagens e apaga o registro-LID
  await prisma.$transaction([
    prisma.waMessage.updateMany({
      where: { contactId: lidContact.id },
      data: { contactId: phoneContact.id },
    }),
    prisma.waContact.delete({ where: { id: lidContact.id } }),
  ]);
}

async function isBlocked(phone: string | null, lid: string | null): Promise<boolean> {
  const keys = [phone, lid].filter(Boolean) as string[];
  if (!keys.length) return false;
  const hit = await prisma.waBlocklist.findFirst({ where: { phone: { in: keys } } });
  return !!hit;
}

/** Salva o base64 de áudio em disco. Retorna o caminho relativo ou null. */
function saveAudioFile(base64: string, waMessageId: string | null): string | null {
  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    const clean = base64.replace(/^data:[^;]+;base64,/, '');
    const fileName = `${Date.now()}-${(waMessageId || 'audio').replace(/[^a-zA-Z0-9_-]/g, '')}.ogg`;
    const fullPath = path.join(AUDIO_DIR, fileName);
    fs.writeFileSync(fullPath, Buffer.from(clean, 'base64'));
    return path.join('uploads', 'wa-audio', fileName);
  } catch (err) {
    console.error('[WA] Erro ao salvar áudio:', err);
    return null;
  }
}

/**
 * Processa um evento já parseado: resolve contato, grava mensagem,
 * vincula cliente e agenda transcrição de áudio. Idempotente.
 */
export async function processWaEvent(event: ParsedWaEvent, userId: string) {
  // Blocklist primeiro — descarta sem gravar nada
  if (await isBlocked(event.phone, event.lid)) return;

  const contactKey = await resolveContactKey(userId, event.phone, event.lid);
  if (!contactKey) return;

  // Idempotência: se a mensagem já existe, não grava de novo (retry da Evolution)
  if (event.waMessageId) {
    const existing = await prisma.waMessage.findUnique({
      where: { waMessageId: event.waMessageId },
      select: { id: true },
    });
    if (existing) return;
  }

  // Acha/cria o contato
  let contact = await prisma.waContact.findUnique({
    where: { userId_phone: { userId, phone: contactKey } },
  });

  if (!contact) {
    const clientId = await findMatchingClientId(userId, contactKey);
    contact = await prisma.waContact.create({
      data: {
        userId,
        phone: contactKey,
        name: !event.isFromMe && event.pushName ? event.pushName : null,
        clientId,
      },
    });
  } else {
    const updates: Record<string, unknown> = {};
    // Nome: só atualiza pelo PushName de mensagem do cliente e se estiver vazio
    if (!event.isFromMe && event.pushName && !contact.name) updates.name = event.pushName;
    // Vínculo retroativo com cliente, se ainda não tem
    if (!contact.clientId) {
      const clientId = await findMatchingClientId(userId, contactKey);
      if (clientId) updates.clientId = clientId;
    }
    if (Object.keys(updates).length) {
      contact = await prisma.waContact.update({ where: { id: contact.id }, data: updates as any });
    }
  }

  // Áudio: salva o arquivo antes de gravar a mensagem
  let mediaPath: string | null = null;
  if (event.msgType === 'audio' && event.mediaBase64) {
    mediaPath = saveAudioFile(event.mediaBase64, event.waMessageId);
  }

  const message = await prisma.waMessage.create({
    data: {
      contactId: contact.id,
      direction: event.isFromMe ? 'OUT' : 'IN',
      content: event.content,
      msgType: event.msgType,
      mediaPath,
      waMessageId: event.waMessageId,
    },
  });

  // Transcrição assíncrona — não bloqueia o fluxo do webhook
  if (mediaPath) {
    transcribeAudioFile(message.id, mediaPath).catch((err) =>
      console.error('[WA] Transcrição falhou:', err?.message || err)
    );
  }
}
