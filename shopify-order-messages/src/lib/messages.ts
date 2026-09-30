import type { SupabaseClient } from '@supabase/supabase-js';
import { loadSettings, type AppSettings } from './settings';
import { assertVars, TEMPLATES, type TemplateKey } from './templates';
import type { MessageRow, ShadowOrder } from './types';
import { sendTemplate } from './whatsapp';

export const RETRY_DELAY_MS = 60_000;
export const MAX_RETRIES = 1;
const LOCK_MS = 2 * 60_000;

// ---------------------------------------------------------------------------
// Queueing
// ---------------------------------------------------------------------------

export interface QueueInput {
  order: Pick<ShadowOrder, 'shopify_order_id' | 'order_no' | 'phone'>;
  templateKey: TemplateKey;
  vars: string[];
  scheduledFor?: Date;
  purpose?: string;
  /** Unique key; a second queue call with the same key is ignored. Pass null to always insert. */
  dedupeKey?: string | null;
}

/**
 * Add a message to message_log with status "queued".
 * Returns the row id, or null if an identical message was already queued (same dedupe key).
 */
export async function queueMessage(db: SupabaseClient, input: QueueInput): Promise<string | null> {
  assertVars(input.templateKey, input.vars);
  const dedupeKey =
    input.dedupeKey === undefined
      ? `${input.order.shopify_order_id}:${input.purpose ?? input.templateKey}`
      : input.dedupeKey;

  const { data, error } = await db
    .from('message_log')
    .insert({
      shopify_order_id: input.order.shopify_order_id,
      order_no: input.order.order_no,
      phone: input.order.phone,
      template_key: input.templateKey,
      vars: input.vars,
      status: 'queued',
      purpose: input.purpose ?? null,
      dedupe_key: dedupeKey,
      scheduled_for: (input.scheduledFor ?? new Date()).toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return null; // already queued
    throw new Error(`queueMessage(${input.templateKey}): ${error.message}`);
  }
  return data.id as string;
}

/** Cancel every queued (unsent) message for an order. Optionally limit to some templates / purposes. */
export async function cancelQueued(
  db: SupabaseClient,
  shopifyOrderId: number,
  reason: string,
  filter?: { templateKeys?: TemplateKey[]; purpose?: string }
): Promise<number> {
  let q = db
    .from('message_log')
    .update({ status: 'cancelled', error: reason, locked_until: null })
    .eq('shopify_order_id', shopifyOrderId)
    .eq('status', 'queued');
  if (filter?.templateKeys?.length) q = q.in('template_key', filter.templateKeys);
  if (filter?.purpose) q = q.eq('purpose', filter.purpose);
  const { data, error } = await q.select('id');
  if (error) throw new Error(`cancelQueued: ${error.message}`);
  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Dispatching
// ---------------------------------------------------------------------------

type Eligibility = { send: true } | { send: false; status: 'cancelled' | 'skipped'; reason: string };

/** Final checks right before sending. Conditions can change between queueing and sending. */
async function checkEligibility(
  db: SupabaseClient,
  msg: MessageRow,
  order: ShadowOrder | null,
  settings: AppSettings
): Promise<Eligibility> {
  const key = msg.template_key;
  const def = TEMPLATES[key];
  if (!def) return { send: false, status: 'skipped', reason: `Unknown template ${key}` };

  if (!settings.enabledTemplates[key]) {
    return { send: false, status: 'skipped', reason: 'Message type switched off in Settings' };
  }
  if (!msg.phone) return { send: false, status: 'skipped', reason: 'No valid phone number on the order' };

  // Opt-in. An explicit opt-out (customer replied STOP) always wins.
  // Marketing templates (review_request) always need an opt-in, even when the rule is off.
  const { data: optIn } = await db.from('opt_ins').select('opted_in').eq('phone', msg.phone).maybeSingle();
  if (optIn && optIn.opted_in === false) {
    return { send: false, status: 'skipped', reason: 'Customer opted out' };
  }
  if ((settings.requireOptIn || def.category === 'marketing') && !optIn?.opted_in) {
    return { send: false, status: 'skipped', reason: 'Customer has not opted in' };
  }

  if (order) {
    const afterCancel = key === 'order_cancelled' || key === 'refund_processed';
    if (order.status === 'cancelled' && !afterCancel) {
      return { send: false, status: 'cancelled', reason: 'Order was cancelled' };
    }
    if (msg.purpose === 'cod_reminder' && order.status !== 'awaiting_cod_confirmation') {
      return { send: false, status: 'cancelled', reason: 'COD order already confirmed' };
    }
    if (key === 'order_processing' && order.status !== 'confirmed') {
      return { send: false, status: 'cancelled', reason: `Order already ${order.status.replace(/_/g, ' ')}` };
    }
    if (key === 'out_for_delivery' && order.status === 'delivered') {
      return { send: false, status: 'cancelled', reason: 'Order already delivered' };
    }
    if (key === 'review_request' && order.status !== 'delivered') {
      return { send: false, status: 'cancelled', reason: 'Order is not in delivered state' };
    }
  }

  return { send: true };
}

/** Lock a queued row so the cron and the webhook never send it twice. */
async function claim(db: SupabaseClient, id: string): Promise<MessageRow | null> {
  const now = new Date();
  const { data, error } = await db
    .from('message_log')
    .update({ locked_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq('id', id)
    .eq('status', 'queued')
    .lte('scheduled_for', now.toISOString())
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`claim: ${error.message}`);
  return (data as MessageRow) ?? null;
}

export interface DispatchResult {
  id: string;
  outcome: 'sent' | 'retry' | 'failed' | 'cancelled' | 'skipped' | 'not_due';
  detail?: string;
}

/** Send one queued message if it is due. Never throws. */
export async function dispatchMessage(
  db: SupabaseClient,
  id: string,
  settings?: AppSettings
): Promise<DispatchResult> {
  try {
    const msg = await claim(db, id);
    if (!msg) return { id, outcome: 'not_due' };

    const cfg = settings ?? (await loadSettings(db));
    const { data: order } = msg.shopify_order_id
      ? await db.from('orders_shadow').select('*').eq('shopify_order_id', msg.shopify_order_id).maybeSingle()
      : { data: null };

    const verdict = await checkEligibility(db, msg, order as ShadowOrder | null, cfg);
    if (!verdict.send) {
      await db
        .from('message_log')
        .update({ status: verdict.status, error: verdict.reason, locked_until: null })
        .eq('id', id);
      return { id, outcome: verdict.status, detail: verdict.reason };
    }

    const result = await sendTemplate(msg.phone!, msg.template_key, msg.vars);

    if (result.ok) {
      await db
        .from('message_log')
        .update({
          status: 'sent',
          wa_message_id: result.messageId,
          test_mode: result.testMode,
          error: null,
          sent_at: new Date().toISOString(),
          locked_until: null,
        })
        .eq('id', id);
      if (msg.template_key === 'order_processing' && order) {
        await db
          .from('orders_shadow')
          .update({ status: 'processing' })
          .eq('shopify_order_id', msg.shopify_order_id!)
          .eq('status', 'confirmed');
      }
      return { id, outcome: 'sent' };
    }

    if (msg.retries < MAX_RETRIES) {
      await db
        .from('message_log')
        .update({
          status: 'queued',
          retries: msg.retries + 1,
          error: result.error,
          scheduled_for: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          locked_until: null,
        })
        .eq('id', id);
      return { id, outcome: 'retry', detail: result.error };
    }

    await db
      .from('message_log')
      .update({ status: 'failed', error: result.error, locked_until: null })
      .eq('id', id);
    return { id, outcome: 'failed', detail: result.error };
  } catch (err) {
    console.error('[dispatch] error', id, err);
    return { id, outcome: 'failed', detail: (err as Error).message };
  }
}

/** Send every queued message that is due now (used by the cron). */
export async function dispatchDue(db: SupabaseClient, limit = 50): Promise<DispatchResult[]> {
  const { data, error } = await db
    .from('message_log')
    .select('id')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`dispatchDue: ${error.message}`);

  const settings = await loadSettings(db);
  const results: DispatchResult[] = [];
  for (const row of data ?? []) {
    results.push(await dispatchMessage(db, row.id as string, settings));
  }
  return results;
}

/** Dispatch a list of freshly queued ids (skips nulls from dedupe hits). */
export async function dispatchNow(db: SupabaseClient, ids: (string | null)[]): Promise<DispatchResult[]> {
  const list = ids.filter((x): x is string => !!x);
  if (list.length === 0) return [];
  const settings = await loadSettings(db);
  const results: DispatchResult[] = [];
  for (const id of list) results.push(await dispatchMessage(db, id, settings));
  return results;
}

/** Create a fresh copy of a message and send it now (dashboard "Resend"). */
export async function resendMessage(db: SupabaseClient, id: string): Promise<DispatchResult> {
  const { data: original, error } = await db.from('message_log').select('*').eq('id', id).single();
  if (error || !original) return { id, outcome: 'failed', detail: 'Message not found' };
  const msg = original as MessageRow;

  const { data: inserted, error: insErr } = await db
    .from('message_log')
    .insert({
      shopify_order_id: msg.shopify_order_id,
      order_no: msg.order_no,
      phone: msg.phone,
      template_key: msg.template_key,
      vars: msg.vars,
      status: 'queued',
      purpose: 'resend',
      dedupe_key: null,
    })
    .select('id')
    .single();
  if (insErr || !inserted) return { id, outcome: 'failed', detail: insErr?.message ?? 'Insert failed' };

  // Mark the original so it drops off the Failed list; its error stays for the record.
  await db.from('message_log').update({ purpose: 'resent' }).eq('id', id);

  return dispatchMessage(db, inserted.id as string);
}
