import { NextResponse } from 'next/server';
import { handleIncomingReply } from '@/lib/order-events';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyDeliveryStatus } from '@/lib/status';
import { incomingText, parseMetaWebhook, verifyMetaSignature, type WaStatusUpdate } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Meta verification handshake: echo hub.challenge when the verify token matches. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.WA_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return new Response('Forbidden', { status: 403 });
}

async function applyStatus(db: ReturnType<typeof createAdminClient>, s: WaStatusUpdate) {
  const e = s.errors?.[0];
  const reason = e
    ? `${e.code ?? ''} ${e.title ?? e.message ?? ''}${e.error_data?.details ? ` (${e.error_data.details})` : ''}`.trim()
    : undefined;
  await applyDeliveryStatus(db, s.id, s.status, reason);
}

/** Delivery statuses and customer replies. Always answers 200 so Meta does not retry forever. */
export async function POST(request: Request) {
  const raw = Buffer.from(await request.arrayBuffer());
  if (!verifyMetaSignature(raw, request.headers.get('x-hub-signature-256'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  try {
    const { statuses, messages } = parseMetaWebhook(JSON.parse(raw.toString('utf8')));
    const db = createAdminClient();

    for (const s of statuses) {
      try {
        await applyStatus(db, s);
      } catch (err) {
        console.error('[whatsapp] status update failed', s.id, err);
      }
    }

    for (const m of messages) {
      try {
        const result = await handleIncomingReply(db, m.from, incomingText(m));
        console.log('[whatsapp] reply', m.id, result);
      } catch (err) {
        console.error('[whatsapp] reply handling failed', m.id, err);
      }
    }
  } catch (err) {
    console.error('[whatsapp] webhook error', err);
  }

  return NextResponse.json({ ok: true });
}
