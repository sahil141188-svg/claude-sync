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
    body: "Hi {{1}}, thank you for choosing Robotek. Your order #{{2}} ({{3}}, Rs {{4}}) is confirmed. We'll update you as soon as it ships.",
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
    body: "Hi {{1}}, we received your Cash on Delivery order #{{2}} (Rs {{3}}). Reply YES to confirm and we'll dispatch it right away.",
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Order number', sample: '1043' },
      { name: 'Order total', sample: '599' },
    ],
  },
  order_processing: {
    key: 'order_processing',
    label: 'Order processing',
    category: 'utility',
    trigger: '2 hours after the order is confirmed, if it has not shipped yet',
    body: 'Hi {{1}}, your order #{{2}} is being checked and packed by our team. Every Robotek product is tested before it leaves our factory.',
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
    body: 'Hi {{1}}, your order #{{2}} has been shipped. Track it here: {{3}}. Expected delivery by {{4}}.',
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
    body: 'Hi {{1}}, your Robotek order #{{2}} is out for delivery today. Please keep your phone handy.',
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
    body: "Hi {{1}}, your order #{{2}} has been delivered. We hope you enjoy your Robotek product. If anything isn't right, reply here and we'll sort it out.",
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
    body: 'Hi {{1}}, how is your Robotek {{2}} working for you? Your feedback helps us keep improving: {{3}} Thank you.',
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
    body: 'Hi {{1}}, your order #{{2}} has been cancelled as requested. If you paid online, your refund will reach you in 5-7 working days. We hope to serve you again.',
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
    body: 'Hi {{1}}, the refund of Rs {{2}} for order #{{3}} has been processed. It may take 5-7 working days to show in your account.',
    variables: [
      { name: 'Customer first name', sample: 'Ravi' },
      { name: 'Refund amount', sample: '899' },
      { name: 'Order number', sample: '1042' },
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
