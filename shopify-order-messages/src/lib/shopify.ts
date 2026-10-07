import crypto from 'node:crypto';
import { normalizePhone } from './phone';
import { truncate } from './format';

export const SHOPIFY_TOPICS = [
  'orders/create',
  'orders/paid',
  'orders/cancelled',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
] as const;

export type ShopifyTopic = (typeof SHOPIFY_TOPICS)[number];

export function isSupportedTopic(topic: string | null): topic is ShopifyTopic {
  return !!topic && (SHOPIFY_TOPICS as readonly string[]).includes(topic);
}

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

/** Verify X-Shopify-Hmac-Sha256 (base64 HMAC-SHA256 of the raw body). */
export function verifyShopifyHmac(rawBody: Buffer | string, hmacHeader: string | null, secret: string | undefined): boolean {
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest();
  let received: Buffer;
  try {
    received = Buffer.from(hmacHeader, 'base64');
  } catch {
    return false;
  }
  return received.length === digest.length && crypto.timingSafeEqual(received, digest);
}

// ---------------------------------------------------------------------------
// Payload types (only the fields we use)
// ---------------------------------------------------------------------------

interface ShopifyAddress {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  phone?: string | null;
  country_code?: string | null;
}

export interface ShopifyOrder {
  id: number;
  name: string; // "#1001"
  order_number?: number;
  email?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  total_price?: string;
  currency?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  order_status_url?: string | null;
  payment_gateway_names?: string[];
  gateway?: string | null;
  buyer_accepts_marketing?: boolean;
  note_attributes?: { name: string; value: string }[];
  tags?: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    email?: string | null;
    sms_marketing_consent?: { state?: string | null } | null;
  } | null;
  shipping_address?: ShopifyAddress | null;
  billing_address?: ShopifyAddress | null;
  line_items?: { title: string; quantity: number; name?: string }[];
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  name?: string | null; // "#01970.1" = order name + fulfillment index
  line_items?: { title: string; quantity: number; name?: string }[];
  status?: string | null;
  shipment_status?: string | null; // confirmed | in_transit | out_for_delivery | delivered | failure | ...
  tracking_url?: string | null;
  tracking_urls?: string[];
  tracking_number?: string | null;
  tracking_company?: string | null;
  estimated_delivery_at?: string | null;
  created_at?: string;
  updated_at?: string;
  destination?: ShopifyAddress | null;
}

export interface ShopifyRefund {
  id: number;
  order_id: number;
  created_at?: string;
  transactions?: { amount: string; kind: string; status: string }[];
  refund_line_items?: { subtotal?: number | string; total_tax?: number | string }[];
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

export function detectPaymentMethod(order: ShopifyOrder): 'cod' | 'prepaid' {
  const gateways = [...(order.payment_gateway_names ?? []), order.gateway ?? '']
    .map((g) => g.toLowerCase())
    .filter(Boolean);
  const isCod = gateways.some(
    (g) => g.includes('cash on delivery') || g.includes('cash_on_delivery') || /\bcod\b/.test(g)
  );
  return isCod ? 'cod' : 'prepaid';
}

export function extractPhone(order: ShopifyOrder): string | null {
  const candidates = [
    order.phone,
    order.customer?.phone,
    order.shipping_address?.phone,
    order.billing_address?.phone,
  ];
  for (const c of candidates) {
    const n = normalizePhone(c);
    if (n) return n;
  }
  return null;
}

export function extractFirstName(order: ShopifyOrder): string {
  const name =
    order.customer?.first_name ||
    order.shipping_address?.first_name ||
    order.billing_address?.first_name ||
    order.shipping_address?.name?.split(' ')[0] ||
    '';
  return name.trim() || 'there';
}

export function orderNumber(order: Pick<ShopifyOrder, 'name' | 'order_number'>): string {
  const n = (order.name ?? '').replace(/^#/, '').trim();
  return n || String(order.order_number ?? '');
}

/** Order number from a fulfillment name: "#01970.1" -> "01970". Null if the name is missing. */
export function orderNumberFromFulfillment(f: Pick<ShopifyFulfillment, 'name'>): string | null {
  const n = (f.name ?? '').replace(/^#/, '').replace(/\.\d+$/, '').trim();
  return n || null;
}

export function itemSummary(order: Pick<ShopifyOrder, 'line_items'>): { summary: string; first: string } {
  const items = order.line_items ?? [];
  if (items.length === 0) return { summary: 'your items', first: 'product' };
  const first = truncate(items[0].title || items[0].name || 'product', 50);
  const rest = items.length - 1;
  return { summary: rest > 0 ? `${first} + ${rest} more` : first, first };
}

/**
 * Consent signals Shopify gives us at checkout:
 * - a cart / note attribute "whatsapp_opt_in" = true | yes | on | 1 (add a checkbox to your cart page)
 * - SMS marketing consent ("Text me with news and offers")
 * - buyer_accepts_marketing (email marketing checkbox)
 */
export function hasCheckoutOptIn(order: ShopifyOrder): boolean {
  const attr = order.note_attributes?.find((a) => a.name?.toLowerCase().replace(/\s+/g, '_') === 'whatsapp_opt_in');
  if (attr && ['true', 'yes', 'on', '1'].includes(String(attr.value).toLowerCase())) return true;
  if (order.customer?.sms_marketing_consent?.state === 'subscribed') return true;
  return order.buyer_accepts_marketing === true;
}

export function refundAmount(refund: ShopifyRefund): number {
  const fromTransactions = (refund.transactions ?? [])
    .filter((t) => t.kind === 'refund' && t.status === 'success')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  if (fromTransactions > 0) return fromTransactions;
  return (refund.refund_line_items ?? []).reduce(
    (sum, li) => sum + Number(li.subtotal || 0) + Number(li.total_tax || 0),
    0
  );
}

export function trackingUrl(f: ShopifyFulfillment): string | null {
  return f.tracking_url || f.tracking_urls?.[0] || null;
}

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Admin API access. Two ways to authenticate:
 * - SHOPIFY_ADMIN_ACCESS_TOKEN: a permanent shpat_ token (legacy custom app in Shopify admin), or
 * - SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET: an app from the Shopify Dev Dashboard installed on
 *   this store. A short-lived token is fetched with the client-credentials grant and cached.
 */
async function adminConfig(): Promise<{ domain: string; token: string; version: string } | null> {
  const domain = (process.env.SHOPIFY_STORE_DOMAIN || '').trim();
  const version = (process.env.SHOPIFY_API_VERSION || '2025-07').trim();
  if (!domain) return null;

  const staticToken = (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
  if (staticToken) return { domain, token: staticToken, version };

  const clientId = (process.env.SHOPIFY_CLIENT_ID || '').trim();
  const clientSecret = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return { domain, token: cachedToken.value, version };
  }
  try {
    const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !json.access_token) {
      console.error('[shopify] client-credentials token failed', res.status, json.error_description ?? '');
      return null;
    }
    cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return { domain, token: cachedToken.value, version };
  } catch (err) {
    console.error('[shopify] client-credentials token error', err);
    return null;
  }
}

/** Fetch an order via the Admin REST API. Used when a fulfillment/refund arrives for an order we have not seen. */
export async function fetchOrder(orderId: number): Promise<ShopifyOrder | null> {
  const cfg = await adminConfig();
  if (!cfg) return null;
  const res = await fetch(`https://${cfg.domain}/admin/api/${cfg.version}/orders/${orderId}.json`, {
    headers: { 'X-Shopify-Access-Token': cfg.token },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('[shopify] fetchOrder failed', orderId, res.status);
    return null;
  }
  const json = (await res.json()) as { order?: ShopifyOrder };
  return json.order ?? null;
}

/** Add tags to an order via the Admin GraphQL API (needs write_orders scope). */
export async function addOrderTags(orderId: number, tags: string[]): Promise<{ ok: boolean; error?: string }> {
  const cfg = await adminConfig();
  if (!cfg) return { ok: false, error: 'Shopify Admin API not configured (SHOPIFY_STORE_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN, or SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET)' };
  const res = await fetch(`https://${cfg.domain}/admin/api/${cfg.version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': cfg.token },
    body: JSON.stringify({
      query: `mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
      }`,
      variables: { id: `gid://shopify/Order/${orderId}`, tags },
    }),
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, error: `Shopify Admin API ${res.status}` };
  const json = (await res.json()) as {
    errors?: { message: string }[];
    data?: { tagsAdd?: { userErrors?: { message: string }[] } };
  };
  const err = json.errors?.[0]?.message ?? json.data?.tagsAdd?.userErrors?.[0]?.message;
  return err ? { ok: false, error: err } : { ok: true };
}
