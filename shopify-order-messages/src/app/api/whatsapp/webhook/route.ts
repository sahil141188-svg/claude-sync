import { NextResponse } from 'next/server';
import { handleIncomingReply } from '@/lib/order-events';
import { createAdminClient } from '@/lib/supabase/admin';
import type { MessageStatus } from '@/lib/types';
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

// A status can only move forward: sent -> delivered -> read. Failed replaces sent/queued only.
const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

async function applyStatus(db: ReturnType<typeof createAdminClient>, s: WaStatusUpdate) {
  const { data: row } = await db.from('message_log').select('id, status').eq('wa_message_id', s.id).maybeSingle();
  if (!row) return;
  const current = row.status as MessageStatus;

  if (s.status === 'failed') {
    if (current === 'delivered' || current === 'read') return;
    const e = s.errors?.[0];
    const reason = e ? `${e.code ?? ''} ${e.title ?? e.message ?? ''}${e.error_data?.details ? ` (${e.error_data.details})` : ''}`.trim() : 'Failed';
    await db.from('message_log').update({ status: 'failed', error: reason }).eq('id', row.id);
    return;
  }
  if ((RANK[s.status] ?? -1) > (RANK[current] ?? 99)) {
    await db.from('message_log').update({ status: s.status }).eq('id', row.id);
  }
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
