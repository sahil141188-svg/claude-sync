import Link from 'next/link';
import { StatusBadge, TestBadge } from '@/components/status-badge';
import { requireAdmin } from '@/lib/auth';
import { formatAmount, formatDateTime } from '@/lib/format';
import { normalizePhone } from '@/lib/phone';
import { TEMPLATES, isTemplateKey, renderTemplate } from '@/lib/templates';
import { ORDER_STAGES, type MessageRow, type ShadowOrder } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STAGE_LABEL = Object.fromEntries(ORDER_STAGES.map((s) => [s.status, s.label]));

function dotClass(status: MessageRow['status']): string {
  switch (status) {
    case 'delivered':
    case 'read':
      return 'bg-red border-red';
    case 'failed':
      return 'bg-red border-red';
    case 'queued':
      return 'bg-yellow border-yellow';
    case 'sent':
      return 'bg-white border-ink-60';
    default:
      return 'bg-ink-10 border-ink-20';
  }
}

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireAdmin();
  const q = ((await searchParams).q ?? '').trim();

  let orders: ShadowOrder[] = [];
  let messages: MessageRow[] = [];

  if (q) {
    const digits = q.replace(/\D/g, '');
    const phone = digits.length >= 10 ? normalizePhone(q) : null;
    if (phone) {
      const [o, m] = await Promise.all([
        supabase.from('orders_shadow').select('*').eq('phone', phone).order('created_at', { ascending: false }).limit(20),
        supabase.from('message_log').select('*').eq('phone', phone).order('created_at', { ascending: true }).limit(500),
      ]);
      orders = (o.data as ShadowOrder[]) ?? [];
      messages = (m.data as MessageRow[]) ?? [];
    } else {
      const orderNo = q.replace(/^#/, '');
      const [o, m] = await Promise.all([
        supabase.from('orders_shadow').select('*').eq('order_no', orderNo).limit(1),
        supabase.from('message_log').select('*').eq('order_no', orderNo).order('created_at', { ascending: true }),
      ]);
      orders = (o.data as ShadowOrder[]) ?? [];
      messages = (m.data as MessageRow[]) ?? [];
    }
  } else {
    const { data } = await supabase.from('orders_shadow').select('*').order('created_at', { ascending: false }).limit(20);
    orders = (data as ShadowOrder[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <form className="flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Order number or phone
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Order number or phone"
          inputMode="search"
          className="h-12 min-w-0 flex-1 rounded-lg border border-ink-20 bg-white px-4 text-base hover:border-ink-40 focus:border-ink focus:outline-none"
        />
        <button type="submit" className="h-12 rounded-lg bg-red px-5 font-semibold text-white transition-colors hover:bg-maroon">
          Search
        </button>
      </form>

      {!q && (
        <section>
          <h1 className="mb-3 text-base font-semibold text-maroon">Latest orders</h1>
          {orders.length === 0 ? (
            <Empty text="No orders yet. They appear here as soon as Shopify sends the first webhook." />
          ) : (
            <ul className="divide-y divide-ink-10 rounded-xl border border-ink-10">
              {orders.map((o) => (
                <li key={o.shopify_order_id}>
                  <Link
                    href={`/dashboard/timeline?q=${encodeURIComponent(o.order_no)}`}
                    className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-maroon-10"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">#{o.order_no}</span>
                      <span className="block truncate text-sm text-ink-60">
                        {o.customer_name} · {o.payment_method === 'cod' ? 'COD' : 'Prepaid'} · Rs {formatAmount(o.total)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-sm">
                      <span className="block">{STAGE_LABEL[o.status] ?? o.status}</span>
                      <span className="block text-xs text-ink-40">{formatDateTime(o.created_at)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {q && orders.length === 0 && messages.length === 0 && <Empty text={`Nothing found for "${q}".`} />}

      {q &&
        (orders.length > 0 ? orders : [null]).map((o) => {
          const list = o ? messages.filter((m) => m.shopify_order_id === o.shopify_order_id) : messages;
          if (!o && list.length === 0) return null;
          return (
            <section key={o?.shopify_order_id ?? 'loose'} className="rounded-xl border border-ink-10 p-4 sm:p-6">
              {o && (
                <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">#{o.order_no}</h2>
                    <p className="text-sm text-ink-60">
                      {o.customer_name} · {o.phone ?? 'no phone'}
                    </p>
                    <p className="text-sm text-ink-60">
                      {o.item_summary} · Rs {formatAmount(o.total)} · {o.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}
                    </p>
                  </div>
                  <span className="rounded-full bg-maroon-10 px-3 py-1 text-sm font-medium text-maroon">
                    {STAGE_LABEL[o.status] ?? o.status}
                  </span>
                </header>
              )}
              {list.length === 0 ? (
                <p className="text-sm text-ink-60">No messages for this order yet.</p>
              ) : (
                <ol className="relative ml-2 border-l-2 border-ink-10">
                  {list.map((m) => {
                    const known = isTemplateKey(m.template_key);
                    const when = m.sent_at ?? (m.status === 'queued' ? m.scheduled_for : m.updated_at);
                    return (
                      <li key={m.id} className="relative pb-6 pl-6 last:pb-0">
                        <span
                          className={`absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 ${dotClass(m.status)}`}
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{known ? TEMPLATES[m.template_key].label : m.template_key}</span>
                          <StatusBadge status={m.status} />
                          {m.test_mode && <TestBadge />}
                          {m.purpose === 'cod_reminder' && <span className="text-xs text-ink-60">Reminder</span>}
                          {m.purpose === 'resend' && <span className="text-xs text-ink-60">Resend</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-60">
                          {m.status === 'queued' ? 'Scheduled for ' : ''}
                          {formatDateTime(when)}
                          {m.retries > 0 ? ` · retried ${m.retries}x` : ''}
                          {!o && m.order_no ? ` · #${m.order_no}` : ''}
                        </p>
                        {known && Array.isArray(m.vars) && m.vars.length === TEMPLATES[m.template_key].variables.length && (
                          <p className="mt-2 rounded-lg bg-ink-5 px-3 py-2 text-sm leading-relaxed text-ink-80 [overflow-wrap:anywhere] whitespace-pre-line">
                            {renderTemplate(m.template_key, m.vars)}
                          </p>
                        )}
                        {known && !(Array.isArray(m.vars) && m.vars.length === TEMPLATES[m.template_key].variables.length) && (
                          <p className="mt-2 text-xs text-ink-60">Saved in an older message format, so no preview is shown.</p>
                        )}
                        {m.error && <p className="mt-1 text-sm text-maroon [overflow-wrap:anywhere]">{m.error}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-ink-20 px-4 py-10 text-center text-ink-60">{text}</p>;
}
