import { createClient } from '@/lib/supabase/server';
import { detectTrend } from '@/lib/trend';
import { TrendChart } from '@/components/charts/trend-chart';
import { RangeTabs, rangeDays } from '@/components/range-tabs';
import type { SugarReading } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** sugar-clone wrapped in try/catch that prints the real error text. */
export default async function TestSugarClone2({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  try {
    const { range = 'weekly' } = await searchParams;
    const supabase = await createClient();
    const since = new Date(Date.now() - rangeDays(range) * 86_400_000).toISOString();
    const { data: readings } = await supabase
      .from('sugar_readings')
      .select('*')
      .gte('measured_at', since)
      .order('measured_at');
    const rows = (readings ?? []) as SugarReading[];
    const chartData = rows.map((r) => ({
      label: new Date(r.measured_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      value: Number(r.value),
    }));
    detectTrend(rows.map((r) => Number(r.value)));
    return (
      <div>
        <p>sugar-clone2 ok ({rows.length} rows)</p>
        <RangeTabs />
        <TrendChart
          data={chartData}
          series={[{ key: 'value', label: 'Sugar', color: '#e11d48' }]}
          referenceY={{ value: 180, label: '180' }}
        />
      </div>
    );
  } catch (err) {
    const digest = (err as { digest?: string })?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw err;
    return (
      <pre>
        CAUGHT: {err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)}
      </pre>
    );
  }
}
