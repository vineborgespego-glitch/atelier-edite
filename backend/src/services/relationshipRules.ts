/**
 * Regras puras de quem entra na fila. Separadas do relationship.ts porque
 * aquele fala com o banco e estas dá para testar sozinhas.
 */

/** Dia e mês de hoje em São Paulo — o servidor pode estar rodando em UTC. */
export function hojeSaoPaulo(at: Date): { dia: number; mes: number } {
  const [dia, mes] = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  })
    .format(at)
    .split('/')
    .map(Number);
  return { dia, mes };
}

/**
 * A data de nascimento é gravada como meio-dia UTC pelo formulário, então
 * o dia/mês em UTC é o dia/mês real — comparar com o "hoje" de São Paulo.
 */
export function ehAniversarioHoje(birthDate: Date, at: Date): boolean {
  const { dia, mes } = hojeSaoPaulo(at);
  return birthDate.getUTCDate() === dia && birthDate.getUTCMonth() + 1 === mes;
}

/**
 * Última vez que a cliente apareceu: pedido ou conversa, o que for mais recente.
 * Sem pedido nenhum devolve null — aí não é reativação, é prospecção, e a gente
 * não manda "estou com saudade" para quem nunca comprou.
 */
export function ultimoContato(ultimoPedido: Date | null, ultimaConversa: Date | null): Date | null {
  if (!ultimoPedido) return null;
  if (ultimaConversa && ultimaConversa > ultimoPedido) return ultimaConversa;
  return ultimoPedido;
}
