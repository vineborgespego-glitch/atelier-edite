/**
 * Horário de atendimento do atelier. Fixo em código de propósito —
 * vira configurável quando a Maria pedir para mudar.
 * Puro (sem banco, sem rede) para dar pra testar direto.
 */

const TZ = 'America/Sao_Paulo';

/** dia da semana (0=dom) → [horaAbre, horaFecha). Dia ausente = fechado. */
const HORARIO: Record<number, [number, number]> = {
  1: [9, 18],
  2: [9, 18],
  3: [9, 18],
  4: [9, 18],
  5: [9, 18],
  6: [9, 13],
};

/** Dia da semana e hora em São Paulo, independente do TZ do servidor. */
export function nowInSaoPaulo(at: Date): { weekday: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    weekday: weekdays.indexOf(get('weekday')),
    hour: Number(get('hour')) % 24, // alguns runtimes devolvem "24" à meia-noite
    minute: Number(get('minute')),
  };
}

export function isBusinessHours(at: Date): boolean {
  const { weekday, hour, minute } = nowInSaoPaulo(at);
  const janela = HORARIO[weekday];
  if (!janela) return false;
  const [abre, fecha] = janela;
  const minutos = hour * 60 + minute;
  return minutos >= abre * 60 && minutos < fecha * 60;
}
