import { normalizePhone, toWaId } from './phone';
import type { DeliveryStatus } from './status';
import { renderTemplate, type TemplateKey } from './templates';
import type { SendResult, WhatsAppProvider } from './whatsapp';

/**
 * Maytapi (maytapi.com) — sends through a WhatsApp number linked by QR code.
 * There are no Meta templates here: the full message text from lib/templates.ts is sent as-is.
 *
 * Env: MAYTAPI_PRODUCT_ID, MAYTAPI_PHONE_ID, MAYTAPI_API_TOKEN
 */
export class MaytapiProvider implements WhatsAppProvider {
  readonly name = 'maytapi';

  async sendTemplate(phone: string, templateKey: TemplateKey, vars: string[]): Promise<SendResult> {
    const productId = (process.env.MAYTAPI_PRODUCT_ID || '').trim();
    const phoneId = (process.env.MAYTAPI_PHONE_ID || '').trim();
    const token = (process.env.MAYTAPI_API_TOKEN || '').trim();
    if (!productId || !phoneId || !token) {
      return { ok: false, error: 'MAYTAPI_PRODUCT_ID / MAYTAPI_PHONE_ID / MAYTAPI_API_TOKEN not set', testMode: false };
    }

    try {
      const res = await fetch(`https://api.maytapi.com/api/${productId}/${phoneId}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-maytapi-key': token },
        body: JSON.stringify({
          to_number: toWaId(phone),
          type: 'text',
          message: renderTemplate(templateKey, vars),
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      let json: { success?: boolean; message?: string; data?: { msgId?: string; id?: string } } = {};
      try {
        json = JSON.parse(text);
      } catch {
        // non-JSON error page; reported below
      }
      const id = json.data?.msgId || json.data?.id;
      if (res.ok && json.success !== false && id) return { ok: true, messageId: String(id), testMode: false };
      return {
        ok: false,
        error: `Maytapi ${res.status}: ${json.message || text.slice(0, 200) || 'Unknown error'}`,
        testMode: false,
      };
    } catch (err) {
      return { ok: false, error: `Network error: ${(err as Error).message}`, testMode: false };
    }
  }
}

// ---------------------------------------------------------------------------
// Incoming Maytapi webhooks
// ---------------------------------------------------------------------------

export interface MaytapiReply {
  from: string; // E.164
  text: string;
}

export interface MaytapiAck {
  msgId: string;
  status: DeliveryStatus;
}

interface MaytapiPayload {
  type?: string;
  message?: { type?: string; text?: string; fromMe?: boolean; caption?: string };
  user?: { phone?: string; id?: string };
  conversation?: string;
  data?: { msgId?: string; ackType?: string; ackCode?: number }[] | Record<string, unknown>;
}

function ackToStatus(ackType?: string, ackCode?: number): DeliveryStatus | null {
  const t = (ackType || '').toLowerCase();
  if (['read', 'played', 'viewed'].includes(t) || ackCode === 3 || ackCode === 4) return 'read';
  if (['delivered', 'device'].includes(t) || ackCode === 2) return 'delivered';
  if (['sent', 'server'].includes(t) || ackCode === 1) return 'sent';
  if (['failed', 'error'].includes(t) || ackCode === -1) return 'failed';
  return null;
}

/** Pull customer replies and delivery receipts out of a Maytapi webhook body. Unknown shapes return nothing. */
export function parseMaytapiWebhook(body: unknown): { replies: MaytapiReply[]; acks: MaytapiAck[] } {
  const replies: MaytapiReply[] = [];
  const acks: MaytapiAck[] = [];
  const p = (body ?? {}) as MaytapiPayload;

  if (p.type === 'message' && p.message && !p.message.fromMe) {
    const raw = p.user?.phone || p.user?.id?.split('@')[0] || p.conversation?.split('@')[0] || '';
    const from = normalizePhone(raw.startsWith('+') ? raw : `+${raw}`);
    const text = (p.message.text || p.message.caption || '').trim();
    if (from && text && !(p.conversation || '').endsWith('@g.us')) replies.push({ from, text });
  }

  if (p.type === 'ack' && Array.isArray(p.data)) {
    for (const a of p.data) {
      const status = ackToStatus(a.ackType, a.ackCode);
      if (a.msgId && status) acks.push({ msgId: String(a.msgId), status });
    }
  }

  return { replies, acks };
}
