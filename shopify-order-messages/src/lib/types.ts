import type { TemplateKey } from './templates';

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_cod_confirmation'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export const ORDER_STAGES: { status: OrderStatus; label: string }[] = [
  { status: 'pending_payment', label: 'Payment pending' },
  { status: 'awaiting_cod_confirmation', label: 'Awaiting COD reply' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'processing', label: 'Packing' },
  { status: 'shipped', label: 'Shipped' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered' },
  { status: 'cancelled', label: 'Cancelled' },
  { status: 'refunded', label: 'Refunded' },
];

export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled' | 'skipped';

export interface ShadowOrder {
  shopify_order_id: number;
  order_no: string;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  total: number | null;
  currency: string | null;
  payment_method: 'cod' | 'prepaid';
  status: OrderStatus;
  item_summary: string | null;
  first_item: string | null;
  tracking_url: string | null;
  order_status_url: string | null;
  delivered_at: string | null;
  cod_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  shopify_order_id: number | null;
  order_no: string | null;
  phone: string | null;
  template_key: TemplateKey;
  vars: string[];
  status: MessageStatus;
  wa_message_id: string | null;
  error: string | null;
  retries: number;
  test_mode: boolean;
  purpose: string | null;
  dedupe_key: string | null;
  scheduled_for: string;
  locked_until: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Order statuses in the order they happen. Terminal states rank highest so they are never overwritten. */
const STATUS_RANK: Record<OrderStatus, number> = {
  pending_payment: 0,
  awaiting_cod_confirmation: 1,
  confirmed: 2,
  processing: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
  refunded: 9,
  cancelled: 10,
};

/** Only move an order forward, never backwards (webhooks can arrive out of order). */
export function laterStatus(current: OrderStatus | undefined, next: OrderStatus): OrderStatus {
  if (!current) return next;
  return STATUS_RANK[next] >= STATUS_RANK[current] ? next : current;
}
