import crypto from 'node:crypto';
import { after, NextResponse } from 'next/server';
import { handleShopifyEvent } from '@/lib/order-events';
import { isSupportedTopic, verifyShopifyHmac } from '@/lib/shopify';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Shopify webhook receiver.
 * 1. Verify the HMAC against the raw body (401 if invalid).
 * 2. Record the event id for idempotency (duplicates return 200 and do nothing).
 * 3. Reply 200 straight away and process the event in the same invocation via after().
 * Processing errors are logged to webhook_events.error, never returned as non-200.
 */
export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());

  if (!verifyShopifyHmac(raw, request.headers.get('x-shopify-hmac-sha256'), process.env.SHOPIFY_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'invalid hmac' }, { status: 401 });
  }

  const topic = request.headers.get('x-shopify-topic');
  if (!isSupportedTopic(topic)) {
    return NextResponse.json({ ok: true, ignored: topic });
  }

  const eventId =
    request.headers.get('x-shopify-event-id') ||
    request.headers.get('x-shopify-webhook-id') ||
    crypto.createHash('sha256').update(raw).digest('hex');
  const dedupeId = `${topic}:${eventId}`;

  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    console.error('[shopify] unparseable body', dedupeId);
    return NextResponse.json({ ok: false, error: 'bad json' });
  }

  try {
    const db = createAdminClient();
    const { error } = await db.from('webhook_events').insert({ shopify_event_id: dedupeId, topic });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true, duplicate: true });
      throw new Error(error.message);
    }

    after(async () => {
      try {
        await handleShopifyEvent(db, topic, payload);
        await db.from('webhook_events').update({ processed: true }).eq('shopify_event_id', dedupeId);
      } catch (err) {
        console.error('[shopify] processing failed', dedupeId, err);
        await db
          .from('webhook_events')
          .update({ error: String((err as Error).message ?? err).slice(0, 1000) })
          .eq('shopify_event_id', dedupeId);
      }
    });
  } catch (err) {
    console.error('[shopify] webhook error', dedupeId, err);
    return NextResponse.json({ ok: false, logged: true });
  }

  return NextResponse.json({ ok: true });
}
