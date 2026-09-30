import crypto from 'node:crypto';
import { maskPhone, toWaId } from './phone';
import { renderTemplate, TEMPLATES, type TemplateKey } from './templates';

/**
 * WhatsApp sending, behind a small interface so the provider can be swapped
 * (Meta Cloud API today; Gupshup, AiSensy, Interakt etc. later) without touching
 * the rest of the app. Add a class that implements WhatsAppProvider and return it
 * from getProvider() based on WA_PROVIDER.
 */

export type SendResult =
  | { ok: true; messageId: string; testMode: boolean }
  | { ok: false; error: string; testMode: boolean };

export interface WhatsAppProvider {
  readonly name: string;
  sendTemplate(phone: string, templateKey: TemplateKey, vars: string[]): Promise<SendResult>;
}

/** True only when WA_LIVE is exactly "true". Anything else is test mode. */
export function isLive(): boolean {
  return process.env.WA_LIVE === 'true';
}

// ---------------------------------------------------------------------------
// Meta WhatsApp Cloud API
// ---------------------------------------------------------------------------

class MetaCloudProvider implements WhatsAppProvider {
  readonly name = 'meta-cloud';

  async sendTemplate(phone: string, templateKey: TemplateKey, vars: string[]): Promise<SendResult> {
    const phoneNumberId = process.env.WA_PHONE_NUMBER_ID;
    const token = process.env.WA_ACCESS_TOKEN;
    if (!phoneNumberId || !token) {
      return { ok: false, error: 'WA_PHONE_NUMBER_ID / WA_ACCESS_TOKEN not set', testMode: false };
    }
    const version = process.env.WA_GRAPH_VERSION || 'v21.0';
    const lang = process.env.WA_TEMPLATE_LANG || 'en';

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toWaId(phone),
      type: 'template',
      template: {
        name: templateKey,
        language: { code: lang },
        components: vars.length
          ? [{ type: 'body', parameters: vars.map((text) => ({ type: 'text', text: String(text) })) }]
          : [],
      },
    };

    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      let json: {
        messages?: { id: string }[];
        error?: { message?: string; code?: number; error_data?: { details?: string } };
      } = {};
      try {
        json = JSON.parse(text);
      } catch {
        // not JSON (proxy or gateway page); the raw text is reported below
      }
      const id = json.messages?.[0]?.id;
      if (res.ok && id) return { ok: true, messageId: id, testMode: false };

      const e = json.error;
      const detail = e?.error_data?.details ? ` (${e.error_data.details})` : '';
      return {
        ok: false,
        error: `${e?.code ?? res.status}: ${e?.message ?? (text.slice(0, 200) || 'Unknown WhatsApp error')}${detail}`,
        testMode: false,
      };
    } catch (err) {
      return { ok: false, error: `Network error: ${(err as Error).message}`, testMode: false };
    }
  }
}

// ---------------------------------------------------------------------------
// Test mode: never calls WhatsApp, just logs what would be sent
// ---------------------------------------------------------------------------

class TestModeProvider implements WhatsAppProvider {
  readonly name = 'test-mode';

  async sendTemplate(phone: string, templateKey: TemplateKey, vars: string[]): Promise<SendResult> {
    console.log(
      `[whatsapp:test] to=${maskPhone(phone)} template=${templateKey} (${TEMPLATES[templateKey].category})\n` +
        `  ${renderTemplate(templateKey, vars)}`
    );
    return { ok: true, messageId: `test_${crypto.randomUUID()}`, testMode: true };
  }
}

export function getProvider(): WhatsAppProvider {
  if (!isLive()) return new TestModeProvider();
  switch ((process.env.WA_PROVIDER || 'meta').toLowerCase()) {
    case 'meta':
    default:
      return new MetaCloudProvider();
  }
}

/** Send an approved template. In test mode (WA_LIVE != "true") the message is only logged. */
export function sendTemplate(phone: string, templateKey: TemplateKey, vars: string[]): Promise<SendResult> {
  return getProvider().sendTemplate(phone, templateKey, vars);
}

// ---------------------------------------------------------------------------
// Incoming Meta webhooks
// ---------------------------------------------------------------------------

/** Verify X-Hub-Signature-256 when WA_APP_SECRET is set. Returns true when no secret is configured. */
export function verifyMetaSignature(rawBody: Buffer, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return true;
  if (!header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(header.slice(7), 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export interface WaStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
  recipient_id?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
}

export interface WaIncomingMessage {
  from: string;
  id: string;
  type: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}

interface MetaWebhookBody {
  entry?: { changes?: { value?: { statuses?: WaStatusUpdate[]; messages?: WaIncomingMessage[] } }[] }[];
}

export function parseMetaWebhook(body: MetaWebhookBody): { statuses: WaStatusUpdate[]; messages: WaIncomingMessage[] } {
  const statuses: WaStatusUpdate[] = [];
  const messages: WaIncomingMessage[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      statuses.push(...(change.value?.statuses ?? []));
      messages.push(...(change.value?.messages ?? []));
    }
  }
  return { statuses, messages };
}

export function incomingText(msg: WaIncomingMessage): string {
  return (
    msg.text?.body ??
    msg.button?.text ??
    msg.button?.payload ??
    msg.interactive?.button_reply?.title ??
    msg.interactive?.list_reply?.title ??
    ''
  ).trim();
}
