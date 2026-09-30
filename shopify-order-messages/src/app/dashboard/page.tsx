import Link from 'next/link';
import { BarChart, type BarDatum } from '@/components/bar-chart';
import { requireAdmin } from '@/lib/auth';
import { istDayKey } from '@/lib/format';
import { ORDER_STAGES } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DAYS = 14;

function istMidnight(daysAgo: number): Date {
  const key = istDayKey(new Date(Date.now() - daysAgo * 86_400_000));
  return new Date(`${key}T00:00:00+05:30`);
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '–';
}

export default async function OverviewPage() {
  const { supabase } = await requireAdmin();
  const today = istMidnight(0);
  const since = istMidnight(DAYS - 1);

  const [recent, failed, ...stageCounts] = await Promise.all([
    supabase
      .from('message_log')
      .select('status, sent_at')
      .not('sent_at', 'is', null)
      .gte('sent_at', since.toISOString())
      .limit(20000),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed')
      .or('purpose.is.null,purpose.neq.resent'),
    ...ORDER_STAGES.map((s) =>
      supabase.from('orders_shadow').select('shopify_order_id', { count: 'exact', head: true }).eq('status', s.status)
    ),
  ]);

  const rows = recent.data ?? [];
  const sentToday = rows.filter((r) => new Date(r.sent_at as string) >= today).length;
  const delivered = rows.filter((r) => r.status === 'delivered' || r.status === 'read').length;
  const read = rows.filter((r) => r.status === 'read').length;

  const buckets = new Map<string, number>();
  for (let i = DAYS - 1; i >= 0; i--) buckets.set(istDayKey(new Date(Date.now() - i * 86_400_000)), 0);
  for (const r of rows) {
    const k = istDayKey(r.sent_at as string);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  const chart: BarDatum[] = [...buckets.entries()].map(([key, value]) => ({
    key,
    value,
    label: new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    }),
  }));

  const cards = [
    { label: 'Sent today', value: String(sentToday), note: 'Since midnight IST' },
    { label: 'Delivered', value: pct(delivered, rows.length), note: `Last ${DAYS} days` },
    { label: 'Read', value: pct(read, rows.length), note: `Last ${DAYS} days` },
    { label: 'Failed', value: String(failed.count ?? 0), note: 'Waiting for a resend', href: '/dashboard/failed', alert: (failed.count ?? 0) > 0 },
  ];

  return (
    <div className="space-y-8">
      <section aria-labelledby="kpis">
        <h1 id="kpis" className="sr-only">Overview</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => {
            const inner = (
              <>
                <p className="text-sm text-ink-60">{c.label}</p>
                <p className={`mt-1 text-3xl font-semibold tabular-nums ${c.alert ? 'text-red' : 'text-ink'}`}>{c.value}</p>
                <p className="mt-1 text-xs text-ink-40">{c.note}</p>
              </>
            );
            return c.href ? (
              <Link key={c.label} href={c.href} className="rounded-xl border border-ink-10 p-4 transition-colors hover:border-maroon">
                {inner}
              </Link>
            ) : (
              <div key={c.label} className="rounded-xl border border-ink-10 p-4">
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="chart" className="rounded-xl border border-ink-10 p-4 sm:p-6">
        <h2 id="chart" className="text-base font-semibold text-maroon">Messages sent, last {DAYS} days</h2>
        <p className="mb-6 text-sm text-ink-60">{rows.length} in total</p>
        <BarChart data={chart} title={`Messages sent per day, last ${DAYS} days`} />
      </section>

      <section aria-labelledby="stages">
        <h2 id="stages" className="mb-3 text-base font-semibold text-maroon">Orders by stage</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ORDER_STAGES.map((s, i) => (
            <li key={s.status} className="rounded-xl border border-ink-10 p-4">
              <p className="text-sm text-ink-60">{s.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{stageCounts[i].count ?? 0}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
