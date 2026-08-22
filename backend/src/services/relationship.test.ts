/**
 * Check das regras que decidem QUEM entra na fila de aprovação.
 * Roda com: npx tsx src/services/relationship.test.ts
 */
import assert from 'assert';
import { ehAniversarioHoje, ultimoContato } from './relationshipRules';

// ── Aniversário ─────────────────────────────────────────────────────────────
// Nascimento gravado como meio-dia UTC (é assim que o formulário salva).
const nasc = new Date('1985-03-14T12:00:00.000Z');

assert.equal(ehAniversarioHoje(nasc, new Date('2026-03-14T15:00:00Z')), true, 'dia certo');
assert.equal(ehAniversarioHoje(nasc, new Date('2026-03-15T15:00:00Z')), false, 'dia seguinte');
assert.equal(ehAniversarioHoje(nasc, new Date('2026-04-14T15:00:00Z')), false, 'outro mes');

// 03h UTC do dia 15 ainda é dia 14 em São Paulo (UTC-3) — o parabéns não pode
// chegar um dia adiantado para quem roda o servidor em UTC.
assert.equal(ehAniversarioHoje(nasc, new Date('2026-03-15T02:00:00Z')), true, 'madrugada UTC ainda e dia 14 em SP');

// ── Última interação ────────────────────────────────────────────────────────
const pedido = new Date('2026-01-10T12:00:00Z');
const conversa = new Date('2026-06-01T12:00:00Z');

assert.deepEqual(ultimoContato(pedido, conversa), conversa, 'conversa mais recente vence');
assert.deepEqual(ultimoContato(conversa, pedido), conversa, 'ordem nao importa');
assert.deepEqual(ultimoContato(pedido, null), pedido, 'sem conversa usa o pedido');
assert.equal(ultimoContato(null, conversa), null, 'sem pedido nao e reativacao, e prospeccao');

console.log('ok — relationship checks passaram');
