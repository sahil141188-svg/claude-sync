/**
 * WhatsApp message templates.
 *
 * The key is also the template name you submit in Meta Business Manager, so it must stay
 * lowercase_snake_case and match exactly. Only the key and the ordered variables are sent to
 * WhatsApp; `body` is used for dashboard previews and test-mode logs, so keep it identical to
 * the text Meta approves.
 */

export const TEMPLATE_KEYS = [
  'order_confirmed',
  'cod_confirmation',
  'order_processing',
  'order_shipped',
  'out_for_delivery',
  'order_delivered',
  'review_request',
  'order_cancelled',
  'refund_processed',
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export type TemplateCategory = 'utility' | 'marketing';

export interface TemplateVariable {
  name: string;
  sample: string;
}

export interface TemplateDef {
  key: TemplateKey;
  label: string;
  category: TemplateCategory;
  trigger: string;
  body: string;
  variables: TemplateVariable[];
}

export const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  order_confirmed: {
    key: 'order_confirmed',
    label: 'Order confirmed',
    category: 'utility',
    trigger: 'Prepaid order placed (orders/create or orders/paid), or a COD customer replies YES',
    body: "Thank you {{1}} for ordering with ROBOTEK.\n\nOrder ID: #{{2}}\nItem: {{3}}\nOrder value: Rs {{4}}\n\nYour order is confirmed. We'll share tracking details as soon as it ships.",
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
      { name: 'Items', sample: 'Robotek 20W Fast Charger + 1 more' },
      { name: 'Order total', sample: '899' },
    ],
  },
  cod_confirmation: {
    key: 'cod_confirmation',
    label: 'COD confirmation',
    category: 'utility',
    trigger: 'Cash on Delivery order placed; sent again as a reminder after 4 hours with no reply',
    body: 'Thank you {{1}} for ordering with ROBOTEK.\n\nOrder ID: #{{2}}\nItem: {{3}}\nAmount to pay on delivery: Rs {{4}}\n\nPlease reply YES to confirm your Cash on Delivery order. We will dispatch it as soon as you confirm.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1043' },
      { name: 'Items', sample: '7-Color Super Soft Silicone Cable' },
      { name: 'Amount to pay', sample: '199' },
    ],
  },
  order_processing: {
    key: 'order_processing',
    label: 'Order processing',
    category: 'utility',
    trigger: '2 hours after the order is confirmed, if it has not shipped yet',
    body: 'Hi {{1}}, your ROBOTEK order is being checked and packed.\n\nOrder ID: #{{2}}\n\nEvery ROBOTEK product is tested before it leaves our factory.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
    ],
  },
  order_shipped: {
    key: 'order_shipped',
    label: 'Order shipped',
    category: 'utility',
    trigger: 'Fulfillment created (fulfillments/create)',
    body: 'Hi {{1}}, your ROBOTEK order has been shipped.\n\nOrder ID: #{{2}}\nTrack your order: {{3}}\nExpected delivery: {{4}}\n\nThank you for choosing ROBOTEK.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
      { name: 'Tracking link', sample: 'https://www.delhivery.com/track/package/1234567890' },
      { name: 'Expected delivery date', sample: '5 Oct 2026' },
    ],
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'Out for delivery',
    category: 'utility',
    trigger: 'Fulfillment update with shipment status "out_for_delivery"',
    body: 'Hi {{1}}, your ROBOTEK order is out for delivery today.\n\nOrder ID: #{{2}}\n\nPlease keep your phone handy so our delivery partner can reach you.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
    ],
  },
  order_delivered: {
    key: 'order_delivered',
    label: 'Order delivered',
    category: 'utility',
    trigger: 'Fulfillment update with shipment status "delivered"',
    body: "Hi {{1}}, your ROBOTEK order has been delivered.\n\nOrder ID: #{{2}}\n\nWe hope you enjoy your product. If anything isn't right, reply here and we'll sort it out.",
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
    ],
  },
  review_request: {
    key: 'review_request',
    label: 'Review request',
    category: 'marketing',
    trigger: '3 days after delivery (always needs opt-in, it is a marketing message)',
    // Meta rejects templates that end with a variable, so a short closing line follows the link.
    body: 'Hi {{1}}, how is your ROBOTEK {{2}} working for you?\n\nYour feedback helps us keep improving: {{3}}\n\nThank you.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Product name', sample: '20W Fast Charger' },
      { name: 'Review link', sample: 'https://robotekindia.com/pages/reviews?order=1042' },
    ],
  },
  order_cancelled: {
    key: 'order_cancelled',
    label: 'Order cancelled',
    category: 'utility',
    trigger: 'Order cancelled (orders/cancelled)',
    body: 'Hi {{1}}, your ROBOTEK order has been cancelled as requested.\n\nOrder ID: #{{2}}\n\nIf you paid online, your refund will reach you in 5-7 working days. We hope to serve you again.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
    ],
  },
  refund_processed: {
    key: 'refund_processed',
    label: 'Refund processed',
    category: 'utility',
    trigger: 'Refund created (refunds/create) with a refunded amount above zero',
    body: 'Hi {{1}}, your ROBOTEK refund has been processed.\n\nOrder ID: #{{2}}\nRefund amount: Rs {{3}}\n\nIt may take 5-7 working days to show in your account.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1042' },
      { name: 'Refund amount', sample: '899' },
    ],
  },
};

export function isTemplateKey(key: string): key is TemplateKey {
  return (TEMPLATE_KEYS as readonly string[]).includes(key);
}

/** Replace {{1}}, {{2}}... with the given values. */
export function renderTemplate(key: TemplateKey, vars: string[]): string {
  return TEMPLATES[key].body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => vars[Number(n) - 1] ?? `{{${n}}}`);
}

export function sampleVars(key: TemplateKey): string[] {
  return TEMPLATES[key].variables.map((v) => v.sample);
}

/** Throws if the variable count does not match the template. */
export function assertVars(key: TemplateKey, vars: string[]): void {
  const expected = TEMPLATES[key].variables.length;
  if (vars.length !== expected) {
    throw new Error(`${key} expects ${expected} variables, got ${vars.length}`);
  }
  if (vars.some((v) => !v || !String(v).trim())) {
    throw new Error(`${key} has an empty variable`);
  }
}
