import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { prisma } from '../lib/prisma';
import { parseWebhookEvent } from '../lib/waParser';
import { processWaEvent } from '../services/waService';
import { sendText } from '../services/waSend';

const router = Router();

// ── Debug: ring buffer dos últimos payloads recebidos ───────────────────────
const DEBUG_BUFFER_SIZE = 20;
const debugBuffer: Array<{ at: string; path: string; accepted: boolean; note: string; payload: any }> = [];

function pushDebug(entry: { path: string; accepted: boolean; note: string; payload: any }) {
  debugBuffer.unshift({ at: new Date().toISOString(), ...entry });
  if (debugBuffer.length > DEBUG_BUFFER_SIZE) debugBuffer.pop();
}

// ── Token do webhook (query string, não JWT) ────────────────────────────────
function checkToken(req: Request): boolean {
  const expected = process.env.WEBHOOK_TOKEN;
  if (!expected) return false; // sem token configurado, webhook fica fechado
  return req.query.token === expected;
}

// ── Resolução do dono (env simples: 1 instância → 1 usuária) ────────────────
let cachedUserId: string | null = null;

async function resolveOwnerUserId(): Promise<string | null> {
  if (cachedUserId) return cachedUserId;
  const email = process.env.WHATSAPP_USER_EMAIL;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      cachedUserId = user.id;
      return cachedUserId;
    }
    console.error(`[WA] WHATSAPP_USER_EMAIL "${email}" não encontrado no banco.`);
    return null;
  }
  // Fallback: primeiro OWNER do sistema
  const owner = await prisma.user.findFirst({ where: { role: 'OWNER' }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  cachedUserId = owner?.id || null;
  return cachedUserId;
}

// ── Webhook (aceita /webhook e /webhook/* — modo "por eventos") ─────────────
async function webhookHandler(req: Request, res: Response) {
  if (!checkToken(req)) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Responde 200 imediatamente; processamento continua async
  res.sendStatus(200);

  const body = req.body;

  setImmediate(async () => {
    try {
      const event = parseWebhookEvent(body);
      if (!event) {
        pushDebug({ path: req.path, accepted: false, note: 'descartado (grupo/sem conteúdo/formato)', payload: summarize(body) });
        return;
      }

      // Filtro de instância: se INSTANCE_NAME está configurado, só aceita a dela
      const expectedInstance = process.env.INSTANCE_NAME;
      if (expectedInstance && event.instanceName && event.instanceName !== expectedInstance) {
        pushDebug({ path: req.path, accepted: false, note: `instância desconhecida: ${event.instanceName}`, payload: summarize(body) });
        return;
      }

      const userId = await resolveOwnerUserId();
      if (!userId) {
        pushDebug({ path: req.path, accepted: false, note: 'dono não resolvido (WHATSAPP_USER_EMAIL)', payload: summarize(body) });
        return;
      }

      await processWaEvent(event, userId);
      pushDebug({
        path: req.path,
        accepted: true,
        note: `${event.isFromMe ? 'OUT' : 'IN'} ${event.msgType} — ${event.phone || event.lid || '?'}`,
        payload: summarize(body),
      });
    } catch (err: any) {
      console.error('[WA] Erro ao processar webhook:', err?.message || err);
      pushDebug({ path: req.path, accepted: false, note: `erro: ${err?.message || err}`, payload: summarize(body) });
    }
  });

  return;
}

/** Resumo do payload pro debug (sem base64 gigante). */
function summarize(body: any) {
  try {
    const clone = JSON.parse(JSON.stringify(body || {}));
    if (clone?.data?.base64) clone.data.base64 = `[base64 ${String(clone.data.base64).length} chars]`;
    if (clone?.data?.Message?.base64) clone.data.Message.base64 = `[base64 ${String(clone.data.Message.base64).length} chars]`;
    if (clone?.base64) clone.base64 = `[base64 ${String(clone.base64).length} chars]`;
    return clone;
  } catch {
    return { note: 'payload não serializável' };
  }
}

router.post('/webhook', webhookHandler);
router.post('/webhook/*', webhookHandler); // Evolution em modo "webhook por eventos" acrescenta o nome do evento na URL

// GET /api/whatsapp/webhook/debug — últimos payloads (protegido pelo mesmo token)
router.get('/webhook/debug', (req: Request, res: Response) => {
  if (!checkToken(req)) return res.status(401).json({ error: 'Token inválido' });
  return res.json({ count: debugBuffer.length, events: debugBuffer });
});

// ── Rotas autenticadas (JWT) ────────────────────────────────────────────────

// POST /api/whatsapp/send — envio manual/teste { number, text }
router.post('/send', authenticate, async (req: AuthRequest, res: Response) => {
  const { number, text } = req.body || {};
  if (!number || !text) return res.status(400).json({ error: 'number e text são obrigatórios' });

  const result = await sendText(number, text);
  if (!result.ok) return res.status(502).json({ error: result.error });
  return res.json({ ok: true, data: result.data });
});

// GET /api/whatsapp/contacts — contatos com última mensagem (base pra fase 2)
router.get('/contacts', authenticate, async (req: AuthRequest, res: Response) => {
  const contacts = await prisma.waContact.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  return res.json({ contacts });
});

// GET /api/whatsapp/contacts/:id/messages — histórico de um contato
router.get('/contacts/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const contact = await prisma.waContact.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

  const messages = await prisma.waMessage.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: 'asc' },
  });
  return res.json({ contact, messages });
});

export default router;
