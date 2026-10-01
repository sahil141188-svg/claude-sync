import type { SupabaseClient } from '@supabase/supabase-js';
import type { MessageStatus } from './types';

export type DeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed';

// A status only moves forward: sent -> delivered -> read. Failed replaces queued/sent only.
const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };

/** Apply a provider delivery receipt to the matching message_log row (matched on wa_message_id). */
export async function applyDeliveryStatus(
  db: SupabaseClient,
  providerMessageId: string,
  status: DeliveryStatus,
  reason?: string
): Promise<void> {
  const { data: row } = await db
    .from('message_log')
    .select('id, status')
    .eq('wa_message_id', providerMessageId)
    .maybeSingle();
  if (!row) return;
  const current = row.status as MessageStatus;

  if (status === 'failed') {
    if (current === 'delivered' || current === 'read') return;
    await db.from('message_log').update({ status: 'failed', error: reason || 'Failed' }).eq('id', row.id);
    return;
  }
  if ((RANK[status] ?? -1) > (RANK[current] ?? 99)) {
    await db.from('message_log').update({ status }).eq('id', row.id);
  }
}
