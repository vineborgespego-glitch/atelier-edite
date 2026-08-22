/**
 * Check mínimo das duas lógicas puras que decidem se o cliente recebe mensagem.
 * Roda com: npx tsx src/services/waAuto.test.ts
 */
import assert from 'assert';
import { isBusinessHours } from './businessHours';
import { statusTemplate, firstName } from './waTemplates';
import { extensionFor } from '../lib/waParser';

// Datas em UTC; São Paulo é UTC-3.
const spm = (iso: string) => new Date(iso);

// ── Horário comercial ───────────────────────────────────────────────────────
assert.equal(isBusinessHours(spm('2026-08-21T13:00:00Z')), true, 'sexta 10h SP');
assert.equal(isBusinessHours(spm('2026-08-21T11:59:00Z')), false, 'sexta 08h59 SP');
assert.equal(isBusinessHours(spm('2026-08-21T12:00:00Z')), true, 'sexta 09h00 SP');
assert.equal(isBusinessHours(spm('2026-08-21T21:00:00Z')), false, 'sexta 18h SP (fechou)');
assert.equal(isBusinessHours(spm('2026-08-22T15:00:00Z')), true, 'sabado 12h SP');
assert.equal(isBusinessHours(spm('2026-08-22T17:00:00Z')), false, 'sabado 14h SP');
assert.equal(isBusinessHours(spm('2026-08-23T15:00:00Z')), false, 'domingo');
assert.equal(isBusinessHours(spm('2026-08-21T03:00:00Z')), false, 'madrugada SP');

// ── Templates por status ────────────────────────────────────────────────────
const order = { title: 'Vestido azul', dueDate: new Date('2026-09-10T12:00:00Z') };

const confirmado = statusTemplate('CONFIRMED', order, 'Ana Paula Souza');
assert.ok(confirmado?.includes('Ana'), 'usa o primeiro nome');
assert.ok(!confirmado?.includes('Paula'), 'nao usa o nome completo');
assert.ok(confirmado?.includes('10/09'), 'inclui a previsao');

assert.ok(statusTemplate('READY', order, 'Ana')?.includes('pronto'));
assert.equal(statusTemplate('DELIVERED', order, 'Ana'), null, 'entrega nao avisa');
assert.equal(statusTemplate('CANCELLED', order, 'Ana'), null);

// Sem prazo não quebra
assert.ok(statusTemplate('CONFIRMED', { title: 'Barra', dueDate: null }, 'Ana'));
assert.equal(firstName(null), 'tudo bem', 'fallback sem nome');

// Regra do projeto: nenhuma mensagem pode ter emoji.
const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
for (const t of [confirmado, statusTemplate('READY', order, 'Ana')]) {
  assert.ok(!emoji.test(t || ''), `template com emoji: ${t}`);
}

// ── Extensão da mídia recebida ──────────────────────────────────────────────
assert.equal(extensionFor('audio/ogg; codecs=opus', 'audio'), 'ogg', 'ignora o codecs');
assert.equal(extensionFor('image/jpeg', 'image'), 'jpeg');
assert.equal(extensionFor('application/pdf', 'document'), 'pdf');
assert.equal(extensionFor(null, 'image'), 'jpg', 'fallback por tipo');
assert.equal(extensionFor('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'document'), 'bin');
assert.equal(extensionFor('', 'coisa-nova'), 'bin', 'tipo desconhecido nao quebra');

console.log('ok — waAuto checks passaram');
