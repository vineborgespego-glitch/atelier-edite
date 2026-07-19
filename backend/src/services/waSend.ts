/**
 * Envio de mensagens de texto pela Evolution GO.
 * Formato descoberto em teste real (difere da doc "padrão"):
 *   POST {EVOLUTION_URL}/send/text
 *   Header: apikey: {TOKEN_DA_INSTANCIA}   (não é "token" nem Bearer)
 *   Body:   { "number": "5541999998888", "text": "mensagem" }
 * Erro pode vir como { "error": "..." } mesmo com HTTP 200 — checar o corpo.
 */

export interface SendTextResult {
  ok: boolean;
  error?: string;
  data?: any;
}

export async function sendText(number: string, text: string): Promise<SendTextResult> {
  const baseUrl = process.env.EVOLUTION_URL;
  const token = process.env.INSTANCE_TOKEN;

  if (!baseUrl || !token) {
    return { ok: false, error: 'EVOLUTION_URL/INSTANCE_TOKEN não configurados' };
  }

  const cleanNumber = number.replace(/\D/g, '');
  if (cleanNumber.length < 10) {
    return { ok: false, error: `Número inválido: ${number}` };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: token,
      },
      body: JSON.stringify({ number: cleanNumber, text }),
      signal: controller.signal,
    });

    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // corpo não-JSON
    }

    // A Evolution GO pode devolver erro no corpo mesmo com HTTP 200
    if (!res.ok || (json && json.error)) {
      return { ok: false, error: json?.error || `HTTP ${res.status}`, data: json };
    }

    return { ok: true, data: json };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Falha de rede ao enviar' };
  } finally {
    clearTimeout(timeout);
  }
}
