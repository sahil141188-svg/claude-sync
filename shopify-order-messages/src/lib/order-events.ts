import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, addHours, formatAmount, formatDate } from './format';
import { cancelQueued, dispatchNow, queueMessage } from './messages';
import { normalizePhone } from './phone';
import {
  addOrderTags,
  detectPaymentMethod,
  extractFirstName,
  extractPhone,
  fetchOrder,
  hasCheckoutOptIn,
  itemSummary,
  orderNumber,
  orderNumberFromFulfillment,
  refundAmount,
  trackingUrl,
  type ShopifyFulfillment,
  type ShopifyOrder,
  type ShopifyRefund,
  type ShopifyTopic,
} from './shopify';
import { laterStatus, type OrderStatus, type ShadowOrder } from './types';

export const PROCESSING_DELAY_HOURS = 2;
export const COD_REMINDER_DELAY_HOURS = 4;
export const REVIEW_DELAY_DAYS = 3;

const PAID_STATES = ['paid', 'partially_paid', 'authorized'];

/** Route a verified Shopify webhook to its handler. Throws on unexpected errors (the caller logs them). */
export async function handleShopifyEvent(db: SupabaseClient, topic: ShopifyTopic, payload: unknown): Promise<void> {
  switch (topic) {
    case 'orders/create':
      return onOrderCreated(db, payload as ShopifyOrder);
    case 'orders/paid':
      return onOrderPaid(db, payload as ShopifyOrder);
    case 'orders/cancelled':
      return onOrderCancelled(db, payload as ShopifyOrder);
    case 'fulfillments/create':
      return onFulfillment(db, payload as ShopifyFulfillment, true);
    case 'fulfillments/update':
      return onFulfillment(db, payload as ShopifyFulfillment, false);
    case 'refunds/create':
      return onRefund(db, payload as ShopifyRefund);
  }
}

// ---------------------------------------------------------------------------
// orders_shadow helpers
// ---------------------------------------------------------------------------

async function getShadow(db: SupabaseClient, shopifyOrderId: number): Promise<ShadowOrder | null> {
  const { data } = await db.from('orders_shadow').select('*').eq('shopify_order_id', shopifyOrderId).maybeSingle();
  return (data as ShadowOrder) ?? null;
}

function initialStatus(order: ShopifyOrder): OrderStatus {
  if (order.cancelled_at) return 'cancelled';
  if (detectPaymentMethod(order) === 'cod') return 'awaiting_cod_confirmation';
  return PAID_STATES.includes(order.financial_status ?? '') ? 'confirmed' : 'pending_payment';
}

/** Insert or update the shadow copy. Status only ever moves forward. */
async function upsertShadow(db: SupabaseClient, order: ShopifyOrder, status: OrderStatus): Promise<ShadowOrder> {
  const existing = await getShadow(db, order.id);
  const { summary, first } = itemSummary(order);
  const row = {
    shopify_order_id: order.id,
    order_no: orderNumber(order),
    customer_name: extractFirstName(order),
    phone: extractPhone(order),
    email: order.email || order.contact_email || order.customer?.email || null,
    total: Number(order.total_price ?? 0),
    currency: order.currency || 'INR',
    payment_method: detectPaymentMethod(order),
    status: laterStatus(existing?.status, status),
    item_summary: summary,
    first_item: first,
    order_status_url: order.order_status_url ?? existing?.order_status_url ?? null,
    ...(existing ? {} : { created_at: order.created_at ?? new Date().toISOString() }),
  };
  const { data, error } = await db.from('orders_shadow').upsert(row, { onConflict: 'shopify_order_id' }).select('*').single();
  if (error) throw new Error(`upsertShadow: ${error.message}`);
  return data as ShadowOrder;
}

/** True for a row saved before we knew the real order number (order_no is Shopify's internal id). */
export function isPlaceholder(o: Pick<ShadowOrder, 'order_no' | 'shopify_order_id'>): boolean {
  return o.order_no === String(o.shopify_order_id);
}

/**
 * Find the order for a fulfillment/refund; fetch it from Shopify if we have never seen it.
 * Orders placed before the orders/create webhook existed only reach us through fulfillments,
 * so a placeholder row is built from the fulfillment and repaired as soon as more is known.
 */
async function resolveOrder(db: SupabaseClient, orderId: number, f?: ShopifyFulfillment): Promise<ShadowOrder | null> {
  const existing = await getShadow(db, orderId);
  if (existing && !isPlaceholder(existing)) return existing;

  const fetched = await fetchOrder(orderId);
  if (fetched) return upsertShadow(db, fetched, existing?.status ?? initialStatus(fetched));

  if (!f) return existing;
  const orderNo = orderNumberFromFulfillment(f);
  const items = f.line_items?.length ? itemSummary(f) : null;
  if (existing) {
    if (!orderNo && !items) return existing;
    const { data, error } = await db
      .from('orders_shadow')
      .update({
        ...(orderNo ? { order_no: orderNo } : {}),
        ...(items && !existing.item_summary ? { item_summary: items.summary, first_item: items.first } : {}),
      })
      .eq('shopify_order_id', orderId)
      .select('*')
      .single();
    if (error) throw new Error(`resolveOrder: ${error.message}`);
    if (orderNo) await renameOrderInMessages(db, orderId, existing.order_no, orderNo);
    return data as ShadowOrder;
  }

  const dest = f.destination;
  const { data, error } = await db
    .from('orders_shadow')
    .upsert(
      {
        shopify_order_id: orderId,
        order_no: orderNo ?? String(orderId),
        customer_name: dest?.first_name || dest?.name?.split(' ')[0] || 'there',
        phone: normalizePhone(dest?.phone),
        status: 'confirmed',
        item_summary: items?.summary ?? null,
        first_item: items?.first ?? null,
      },
      { onConflict: 'shopify_order_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(`resolveOrder: ${error.message}`);
  return data as ShadowOrder;
}

/** Point an order's messages at its real number; queued ones were built with the placeholder. */
async function renameOrderInMessages(db: SupabaseClient, shopifyOrderId: number, oldNo: string, newNo: string) {
  if (oldNo === newNo) return;
  const { data: queued } = await db
    .from('message_log')
    .select('id, vars')
    .eq('shopify_order_id', shopifyOrderId)
    .eq('status', 'queued');
  for (const m of queued ?? []) {
    const vars = (m.vars as string[]).map((v) =>
      v === oldNo ? newNo : v.replace(`order=${oldNo}`, `order=${encodeURIComponent(newNo)}`)
    );
    await db.from('message_log').update({ vars }).eq('id', m.id);
  }
  await db.from('message_log').update({ order_no: newNo }).eq('shopify_order_id', shopifyOrderId);
}

/** Fill in placeholder rows from the Shopify Admin API (needs Admin API access). Run by the cron. */
export async function repairPlaceholderOrders(db: SupabaseClient, limit = 10): Promise<number> {
  const { data } = await db
    .from('orders_shadow')
    .select('shopify_order_id, order_no, status')
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = ((data ?? []) as ShadowOrder[]).filter(isPlaceholder).slice(0, limit);
  let fixed = 0;
  for (const row of rows) {
    const fetched = await fetchOrder(row.shopify_order_id);
    if (!fetched) break; // no Admin API access; try again next run
    const o = await upsertShadow(db, fetched, row.status);
    await renameOrderInMessages(db, o.shopify_order_id, row.order_no, o.order_no);
    fixed++;
  }
  return fixed;
}

async function recordCheckoutOptIn(db: SupabaseClient, order: ShopifyOrder, phone: string | null) {
  if (!phone || !hasCheckoutOptIn(order)) return;
  const { data: current } = await db.from('opt_ins').select('opted_in').eq('phone', phone).maybeSingle();
  if (current?.opted_in === false) return; // respect an earlier STOP
  await db.from('opt_ins').upsert({ phone, opted_in: true, source: 'shopify_checkout' }, { onConflict: 'phone' });
}

function name(o: ShadowOrder) {
  return o.customer_name || 'there';
}

/** Queue order_confirmed now and order_processing 2 hours later. */
async function queueConfirmation(db: SupabaseClient, o: ShadowOrder): Promise<(string | null)[]> {
  const now = new Date();
  const confirmed = await queueMessage(db, {
    order: o,
    templateKey: 'order_confirmed',
    vars: [name(o), o.order_no, o.item_summary || 'your items', formatAmount(o.total)],
  });
  await queueMessage(db, {
    order: o,
    templateKey: 'order_processing',
    vars: [name(o), o.order_no],
    scheduledFor: addHours(now, PROCESSING_DELAY_HOURS),
  });
  return [confirmed];
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function onOrderCreated(db: SupabaseClient, order: ShopifyOrder) {
  const status = initialStatus(order);
  const o = await upsertShadow(db, order, status);
  await recordCheckoutOptIn(db, order, o.phone);

  if (o.status === 'cancelled') return;

  if (o.payment_method === 'cod') {
    if (o.status !== 'awaiting_cod_confirmation') return;
    const vars = [name(o), o.order_no, o.item_summary || 'your items', formatAmount(o.total)];
    const first = await queueMessage(db, { order: o, templateKey: 'cod_confirmation', vars });
    await queueMessage(db, {
      order: o,
      templateKey: 'cod_confirmation',
      vars,
      purpose: 'cod_reminder',
      scheduledFor: addHours(new Date(), COD_REMINDER_DELAY_HOURS),
    });
    await dispatchNow(db, [first]);
    return;
  }

  if (o.status === 'confirmed' || o.status === 'processing') {
    await dispatchNow(db, await queueConfirmation(db, o));
  }
  // pending_payment: wait for orders/paid
}

async function onOrderPaid(db: SupabaseClient, order: ShopifyOrder) {
  const existing = await getShadow(db, order.id);
  // A COD order marked paid on delivery must not trigger a new confirmation.
  const isCod = (existing?.payment_method ?? detectPaymentMethod(order)) === 'cod';
  const o = await upsertShadow(db, order, isCod ? existing?.status ?? 'confirmed' : 'confirmed');
  if (!existing) await recordCheckoutOptIn(db, order, o.phone);
  if (isCod || o.status === 'cancelled') return;
  // Dedupe keys make this a no-op if orders/create already queued these.
  await dispatchNow(db, await queueConfirmation(db, o));
}

async function onOrderCancelled(db: SupabaseClient, order: ShopifyOrder) {
  const o = await upsertShadow(db, order, 'cancelled');
  // Nothing queued for this order may go out now: no Processing, Shipped, reminders or reviews.
  await cancelQueued(db, o.shopify_order_id, 'Order was cancelled');
  const id = await queueMessage(db, {
    order: o,
    templateKey: 'order_cancelled',
    vars: [name(o), o.order_no],
  });
  await dispatchNow(db, [id]);
}

async function onFulfillment(db: SupabaseClient, f: ShopifyFulfillment, isCreate: boolean) {
  const o = await resolveOrder(db, f.order_id, f);
  if (!o) {
    console.warn('[fulfillment] unknown order', f.order_id);
    return;
  }
  if (o.status === 'cancelled') return;

  const shipment = (f.shipment_status || '').toLowerCase();
  const ids: (string | null)[] = [];
  const link = trackingUrl(f) || o.tracking_url || o.order_status_url;

  // Shipped: on create, or on the first update that still looks like it is in transit.
  const inTransitStates = ['', 'confirmed', 'in_transit', 'label_printed', 'label_purchased', 'attempted_delivery'];
  if ((isCreate || inTransitStates.includes(shipment)) && f.status !== 'cancelled') {
    const eta = f.estimated_delivery_at
      ? new Date(f.estimated_delivery_at)
      : addDays(new Date(f.created_at ?? Date.now()), Number(process.env.DEFAULT_DELIVERY_DAYS || 5));
    await db
      .from('orders_shadow')
      .update({ status: laterStatus(o.status, 'shipped'), tracking_url: link })
      .eq('shopify_order_id', o.shopify_order_id);
    // Processing is pointless once the parcel has left.
    await cancelQueued(db, o.shopify_order_id, 'Order shipped before this was sent', {
      templateKeys: ['order_processing'],
    });
    if (link) {
      ids.push(
        await queueMessage(db, {
          order: o,
          templateKey: 'order_shipped',
          vars: [name(o), o.order_no, link, formatDate(eta)],
        })
      );
    } else {
      console.warn('[fulfillment] no tracking link for order', o.order_no);
    }
  }

  if (shipment === 'out_for_delivery') {
    await db
      .from('orders_shadow')
      .update({ status: laterStatus(o.status, 'out_for_delivery') })
      .eq('shopify_order_id', o.shopify_order_id);
    ids.push(await queueMessage(db, { order: o, templateKey: 'out_for_delivery', vars: [name(o), o.order_no] }));
  }

  if (shipment === 'delivered') {
    const deliveredAt = new Date(f.updated_at ?? Date.now());
    await db
      .from('orders_shadow')
      .update({ status: laterStatus(o.status, 'delivered'), delivered_at: deliveredAt.toISOString() })
      .eq('shopify_order_id', o.shopify_order_id);
    await cancelQueued(db, o.shopify_order_id, 'Order already delivered', {
      templateKeys: ['order_processing', 'out_for_delivery'],
    });
    ids.push(await queueMessage(db, { order: o, templateKey: 'order_delivered', vars: [name(o), o.order_no] }));
    await queueMessage(db, {
      order: o,
      templateKey: 'review_request',
      vars: [name(o), productName(o.first_item), reviewUrl(o.order_no)],
      scheduledFor: addDays(deliveredAt, REVIEW_DELAY_DAYS),
    });
  }

  await dispatchNow(db, ids);
}

async function onRefund(db: SupabaseClient, refund: ShopifyRefund) {
  const o = await resolveOrder(db, refund.order_id);
  if (!o) {
    console.warn('[refund] unknown order', refund.order_id);
    return;
  }
  const amount = refundAmount(refund);
  if (amount <= 0) return; // restock-only refunds carry no money

  if (o.total && amount >= Number(o.total)) {
    await db
      .from('orders_shadow')
      .update({ status: laterStatus(o.status, 'refunded') })
      .eq('shopify_order_id', o.shopify_order_id);
  }
  const id = await queueMessage(db, {
    order: o,
    templateKey: 'refund_processed',
    vars: [name(o), o.order_no, formatAmount(amount)],
    dedupeKey: `${o.shopify_order_id}:refund:${refund.id}`,
  });
  await dispatchNow(db, [id]);
}

/** The template already says "your Robotek {{2}}", so drop a leading brand name from the product title. */
export function productName(title: string | null): string {
  const clean = (title ?? '').replace(/^robotek\s+/i, '').trim();
  return clean || 'product';
}

export function reviewUrl(orderNo: string): string {
  const base = process.env.REVIEW_URL || 'https://robotekindia.com/pages/reviews?order={order_no}';
  return base.replace('{order_no}', encodeURIComponent(orderNo));
}

// ---------------------------------------------------------------------------
// Incoming WhatsApp replies
// ---------------------------------------------------------------------------

const YES_WORDS = ['yes', 'y', 'yes.', 'confirm', 'confirmed', 'ok yes', 'yes confirm'];
const STOP_WORDS = ['stop', 'unsubscribe', 'stop all', 'opt out'];
const START_WORDS = ['start', 'subscribe', 'opt in'];

/** Handle a customer's WhatsApp reply. Returns a short description for logs. */
export async function handleIncomingReply(db: SupabaseClient, fromWaId: string, text: string): Promise<string> {
  const phone = normalizePhone(`+${fromWaId.replace(/^\+/, '')}`);
  if (!phone) return 'ignored: bad phone';
  const word = text.trim().toLowerCase().replace(/[!]+$/, '');

  if (STOP_WORDS.includes(word)) {
    await db.from('opt_ins').upsert({ phone, opted_in: false, source: 'whatsapp_reply' }, { onConflict: 'phone' });
    await db
      .from('message_log')
      .update({ status: 'skipped', error: 'Customer opted out' })
      .eq('phone', phone)
      .eq('status', 'queued');
    return 'opted out';
  }

  if (START_WORDS.includes(word)) {
    await db.from('opt_ins').upsert({ phone, opted_in: true, source: 'whatsapp_reply' }, { onConflict: 'phone' });
    return 'opted in';
  }

  if (!YES_WORDS.includes(word)) return 'ignored: free text';

  const { data: order } = await db
    .from('orders_shadow')
    .select('*')
    .eq('phone', phone)
    .eq('payment_method', 'cod')
    .eq('status', 'awaiting_cod_confirmation')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!order) return 'ignored: no COD order awaiting confirmation';
  const o = order as ShadowOrder;

  // A customer writing to us counts as consent for order updates, unless they said STOP before.
  const { data: current } = await db.from('opt_ins').select('opted_in').eq('phone', phone).maybeSingle();
  if (current?.opted_in !== false) {
    await db.from('opt_ins').upsert({ phone, opted_in: true, source: 'whatsapp_reply' }, { onConflict: 'phone' });
  }

  const { data: updated } = await db
    .from('orders_shadow')
    .update({ status: 'confirmed', cod_confirmed_at: new Date().toISOString() })
    .eq('shopify_order_id', o.shopify_order_id)
    .eq('status', 'awaiting_cod_confirmation')
    .select('*')
    .maybeSingle();
  if (!updated) return 'ignored: already confirmed';

  await cancelQueued(db, o.shopify_order_id, 'Customer confirmed COD', { purpose: 'cod_reminder' });

  const tag = await addOrderTags(o.shopify_order_id, ['cod-confirmed']);
  if (!tag.ok) console.error('[cod] tagging failed', o.order_no, tag.error);

  await dispatchNow(db, await queueConfirmation(db, updated as ShadowOrder));
  return `cod confirmed for #${o.order_no}${tag.ok ? ' (tagged)' : ` (tag failed: ${tag.error})`}`;
}
