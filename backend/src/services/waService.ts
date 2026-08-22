import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ParsedWaEvent, extensionFor } from '../lib/waParser';
import { transcribeAudioFile } from './waTranscription';
import { describeImageFile } from './waVision';
import { fetchMediaBase64 } from './waSend';

/** Tipos de mensagem que trazem arquivo junto. */
const MEDIA_TYPES = ['audio', 'image', 'video', 'document', 'sticker'];

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

/**
 * Grava um arquivo de mídia em disco e devolve o caminho relativo servido
 * pelo /uploads estático (ou null se falhou).
 * Áudio vai pra uploads/wa-audio — o worker de transcrição já aponta pra lá.
 */
export function saveMediaBuffer(
  buffer: Buffer,
  nomeBase: string,
  msgType: string,
  mimetype: string | null
): string | null {
  try {
    const subdir = msgType === 'audio' ? 'wa-audio' : 'wa-media';
    const dir = path.resolve(process.cwd(), 'uploads', subdir);
    fs.mkdirSync(dir, { recursive: true });
    const ext = extensionFor(mimetype, msgType);
    const fileName = `${Date.now()}-${(nomeBase || msgType).replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
    fs.writeFileSync(path.join(dir, fileName), buffer);
    return path.join('uploads', subdir, fileName).replace(/\\/g, '/');
  } catch (err) {
    console.error('[WA] Erro ao salvar mídia:', err);
    return null;
  }
}

function saveMediaFile(
  base64: string,
  waMessageId: string | null,
  msgType: string,
  mimetype: string | null
): string | null {
  const clean = base64.replace(/^data:[^;]+;base64,/, '');
  return saveMediaBuffer(Buffer.from(clean, 'base64'), waMessageId || msgType, msgType, mimetype);
}

/**
 * Grava no histórico uma mensagem que NÓS enviamos (automática ou manual).
 * A Evolution até ecoa o fromMe pelo webhook, mas sem garantia de chegada nem
 * de prazo — e o dedupe por waMessageId não cobre este caso (não temos o ID).
 * Contato inexistente é criado, já vinculado ao Client se o telefone bater.
 */
export async function recordOutgoing(
  userId: string,
  phone: string,
  content: string,
  msgType = 'text',
  mediaPath: string | null = null
) {
  const key = (phone || '').replace(/\D/g, '');
  if (!key) return;

  let contact = await prisma.waContact.findUnique({
    where: { userId_phone: { userId, phone: key } },
  });
  if (!contact) {
    // O cadastro pode ter o número sem 55/DDD e o webhook grava com — sem esta
    // busca tolerante o mesmo cliente vira duas conversas.
    // ponytail: varre os contatos do user em memória; indexar se passar de alguns milhares
    const all = await prisma.waContact.findMany({ where: { userId } });
    contact = all.find((c) => phonesMatch(c.phone, key)) || null;
  }
  if (!contact) {
    contact = await prisma.waContact.create({
      data: { userId, phone: key, clientId: await findMatchingClientId(userId, key) },
    });
  }

  await prisma.waMessage.create({
    data: { contactId: contact.id, direction: 'OUT', content, msgType, mediaPath },
  });
  // updatedAt do contato move a conversa pro topo da inbox
  await prisma.waContact.update({ where: { id: contact.id }, data: { updatedAt: new Date() } });
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

  // Mídia (áudio, imagem, vídeo, documento, figurinha): salva antes de gravar
  let mediaPath: string | null = null;
  if (MEDIA_TYPES.includes(event.msgType)) {
    // Sem base64 no webhook (WEBHOOK_BASE64 desligado na Evolution), busca sob demanda.
    const base64 =
      event.mediaBase64 ||
      (event.waMessageId && event.chatJid
        ? await fetchMediaBase64({
            remoteJid: event.chatJid,
            id: event.waMessageId,
            fromMe: event.isFromMe,
          })
        : null);
    if (base64) {
      mediaPath = saveMediaFile(base64, event.waMessageId, event.msgType, event.mimetype);
    }
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

  // Áudio vira texto, imagem vira descrição — assíncrono, não segura o webhook.
  // Só o que chega da cliente: descrever/transcrever o que nós mandamos é gastar à toa.
  if (mediaPath && !event.isFromMe) {
    if (event.msgType === 'audio') {
      transcribeAudioFile(message.id, mediaPath).catch((err) =>
        console.error('[WA] Transcrição falhou:', err?.message || err)
      );
    } else if (event.msgType === 'image') {
      describeImageFile(message.id, mediaPath).catch((err) =>
        console.error('[WA] Descrição de imagem falhou:', err?.message || err)
      );
    }
  }

  // Quem decide o que fazer com a mensagem é o chamador (evita ciclo de import
  // waService → waOffHours → waAuto → waService).
  return { contactId: contact.id, isIncoming: !event.isFromMe };
}
