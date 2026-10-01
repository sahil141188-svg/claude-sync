import crypto from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { parseMaytapiWebhook } from '@/lib/maytapi';
import { handleIncomingReply } from '@/lib/order-events';
import { applyDeliveryStatus } from '@/lib/status';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Constant-time compare of the ?key= secret (Maytapi does not sign webhooks). */
function keyMatches(given: string | null): boolean {
  const expected = (process.env.MAYTAPI_WEBHOOK_SECRET || '').trim();
  if (!expected) return true; // not configured: accept (set it in production)
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Maytapi webhook: customer replies (YES / STOP / START) and delivery receipts.
 * Point Maytapi's phone webhook at https://<domain>/api/maytapi/webhook?key=<MAYTAPI_WEBHOOK_SECRET>.
 * Every event is also forwarded unchanged to MAYTAPI_FORWARD_URL, so an existing
 * integration (e.g. a Google Apps Script) keeps receiving everything it did before.
 * Always answers 200 once the key matches, so Maytapi never retries or disables the hook.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!keyMatches(url.searchParams.get('key'))) {
    return NextResponse.json({ error: 'invalid key' }, { status: 401 });
  }

  const raw = await request.text();
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    console.error('[maytapi] unparseable body');
  }

  after(async () => {
    const forward = (process.env.MAYTAPI_FORWARD_URL || '').trim();
    if (forward) {
      try {
        await fetch(forward, {
          method: 'POST',
          headers: { 'Content-Type': request.headers.get('content-type') || 'application/json' },
          body: raw,
          signal: AbortSignal.timeout(10_000),
        });
      } catch (err) {
        console.error('[maytapi] forward failed', err);
      }
    }

    if (!body) return;
    try {
      const { replies, acks } = parseMaytapiWebhook(body);
      const db = createAdminClient();
      for (const a of acks) {
        await applyDeliveryStatus(db, a.msgId, a.status).catch((err) =>
          console.error('[maytapi] ack failed', a.msgId, err)
        );
      }
      for (const r of replies) {
        const result = await handleIncomingReply(db, r.from.replace(/^\+/, ''), r.text);
        console.log('[maytapi] reply', result);
      }
    } catch (err) {
      console.error('[maytapi] processing failed', err);
    }
  });

  return NextResponse.json({ ok: true });
}

/** Lets you open the URL in a browser to check it is deployed. */
export async function GET() {
  return NextResponse.json({ ok: true, provider: 'maytapi' });
}
