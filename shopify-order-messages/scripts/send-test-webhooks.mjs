#!/usr/bin/env node
/**
 * Send fake, correctly signed Shopify webhooks to the endpoint, one per topic,
 * so the whole flow can be tested without real orders.
 *
 * Usage:
 *   SHOPIFY_WEBHOOK_SECRET=... node scripts/send-test-webhooks.mjs [baseUrl] [options]
 *
 *   baseUrl            default http://localhost:3000
 *   --phone=98xxxxxxxx customer phone (default 9876543210, normalised to +91)
 *   --scenario=name    full (default): create > paid > shipped > out for delivery > delivered > refund > cancel
 *                      cancel: create > cancel > shipped (proves nothing is sent after a cancel)
 *                      delivered: create > paid > shipped > out for delivery > delivered
 *   --only=topic,...   send only these topics, e.g. --only=orders/create,orders/cancelled
 *   --duplicate        send orders/create twice with the same event id (second must be ignored)
 *   --cod              make the order Cash on Delivery (default prepaid)
 *   --cod-yes          also send a fake WhatsApp "YES" reply (uses WA_APP_SECRET if set)
 *   --opt-in           mark the customer as opted in via a whatsapp_opt_in note attribute (default on)
 *   --no-opt-in        leave the customer without an opt-in
 *   --bad-hmac         send one request with a wrong signature (expect 401)
 *
 * Reads SHOPIFY_WEBHOOK_SECRET (and WA_APP_SECRET) from the environment or .env.local.
 * Messages are only logged unless the server runs with WA_LIVE=true.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- tiny .env.local loader (no dependency) ---
for (const file of ['.env.local', '.env']) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const baseUrl = (args.find((a) => !a.startsWith('--')) || 'http://localhost:3000').replace(/\/$/, '');
const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
if (!secret) {
  console.error('SHOPIFY_WEBHOOK_SECRET is not set.');
  process.exit(1);
}

const phone = opt('phone') || '9876543210';
const isCod = flag('cod') || flag('cod-yes');
const optIn = !flag('no-opt-in');
const only = opt('only')?.split(',');

const orderId = 5_000_000_000 + Math.floor(Math.random() * 1_000_000);
const orderNo = String(1000 + Math.floor(Math.random() * 9000));
const now = new Date().toISOString();

const order = {
  id: orderId,
  name: `#${orderNo}`,
  order_number: Number(orderNo),
  email: 'test.customer@example.com',
  phone: null,
  total_price: '899.00',
  currency: 'INR',
  financial_status: isCod ? 'pending' : 'paid',
  fulfillment_status: null,
  cancelled_at: null,
  created_at: now,
  order_status_url: `https://robotekindia.com/orders/${orderId}/authenticate`,
  payment_gateway_names: [isCod ? 'Cash on Delivery (COD)' : 'razorpay'],
  buyer_accepts_marketing: false,
  note_attributes: optIn ? [{ name: 'whatsapp_opt_in', value: 'true' }] : [],
  customer: { first_name: 'Ravi', last_name: 'Kumar', phone: null, email: 'test.customer@example.com' },
  shipping_address: { first_name: 'Ravi', last_name: 'Kumar', phone, country_code: 'IN' },
  billing_address: { first_name: 'Ravi', last_name: 'Kumar', phone, country_code: 'IN' },
  line_items: [
    { title: 'Robotek 20W Fast Charger', quantity: 1 },
    { title: 'Robotek Type-C Cable 1m', quantity: 1 },
  ],
};

const fulfillment = (shipment_status) => ({
  id: orderId + 1,
  order_id: orderId,
  status: 'success',
  shipment_status,
  tracking_company: 'Delhivery',
  tracking_number: '1234567890',
  tracking_url: 'https://www.delhivery.com/track/package/1234567890',
  created_at: now,
  updated_at: new Date().toISOString(),
  destination: { first_name: 'Ravi', phone },
});

const created = ['orders/create', order];
const paid = ['orders/paid', { ...order, financial_status: 'paid' }];
const shipped = ['fulfillments/create', fulfillment(null)];
const outForDelivery = ['fulfillments/update', fulfillment('out_for_delivery')];
const delivered = ['fulfillments/update', fulfillment('delivered')];
const cancelled = ['orders/cancelled', { ...order, cancelled_at: new Date().toISOString(), financial_status: 'refunded' }];

const scenarios = {
  cancel: [created, cancelled, shipped],
  delivered: [created, paid, shipped, outForDelivery, delivered],
};

const fullSteps = [
  ['orders/create', order],
  ['orders/paid', { ...order, financial_status: 'paid' }],
  ['fulfillments/create', fulfillment(null)],
  ['fulfillments/update', fulfillment('out_for_delivery')],
  ['fulfillments/update', fulfillment('delivered')],
  ['refunds/create', {
    id: orderId + 2,
    order_id: orderId,
    created_at: now,
    transactions: [{ amount: '299.00', kind: 'refund', status: 'success' }],
  }],
  cancelled,
];
const scenario = opt('scenario') || 'full';
const steps = scenarios[scenario] ?? fullSteps;

async function sendShopify(topic, body, { badHmac = false, eventId = crypto.randomUUID() } = {}) {
  const raw = JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', badHmac ? 'wrong-secret' : secret).update(raw).digest('base64');
  const res = await fetch(`${baseUrl}/api/shopify/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Topic': topic,
      'X-Shopify-Hmac-Sha256': hmac,
      'X-Shopify-Shop-Domain': 'robotek1.myshopify.com',
      'X-Shopify-Event-Id': eventId,
      'X-Shopify-Webhook-Id': crypto.randomUUID(),
      'X-Shopify-API-Version': '2025-07',
    },
    body: raw,
  });
  const text = await res.text();
  console.log(`${String(res.status).padEnd(4)} ${topic.padEnd(22)} ${text}`);
  return res;
}

async function sendWhatsAppReply(text) {
  const body = {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          messages: [{
            from: `91${phone.replace(/\D/g, '').slice(-10)}`,
            id: `wamid.test.${crypto.randomUUID()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: text },
          }],
        },
      }],
    }],
  };
  const raw = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.WA_APP_SECRET) {
    headers['X-Hub-Signature-256'] = `sha256=${crypto.createHmac('sha256', process.env.WA_APP_SECRET).update(raw).digest('hex')}`;
  }
  const res = await fetch(`${baseUrl}/api/whatsapp/webhook`, { method: 'POST', headers, body: raw });
  console.log(`${String(res.status).padEnd(4)} whatsapp reply "${text}"   ${await res.text()}`);
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`Target:  ${baseUrl}`);
console.log(`Order:   #${orderNo} (id ${orderId}), ${isCod ? 'COD' : 'prepaid'}, phone ${phone}, opt-in ${optIn}, scenario ${scenario}\n`);

if (flag('bad-hmac')) {
  await sendShopify('orders/create', order, { badHmac: true });
}

if (flag('duplicate')) {
  const eventId = crypto.randomUUID();
  await sendShopify('orders/create', order, { eventId });
  await sendShopify('orders/create', order, { eventId });
  await pause(1200);
}

for (const [topic, body] of steps) {
  if (only && !only.includes(topic)) continue;
  await sendShopify(topic, body);
  await pause(1200); // let after() finish so events apply in order
  if (topic === 'orders/create' && flag('cod-yes')) {
    await sendWhatsAppReply('YES');
    await pause(1200);
  }
}

console.log(`\nDone. Open ${baseUrl}/dashboard/timeline?q=${orderNo} to see the messages.`);
