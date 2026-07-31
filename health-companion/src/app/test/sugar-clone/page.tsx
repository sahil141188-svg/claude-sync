import { createClient } from '@/lib/supabase/server';
import { detectTrend, sugarSuggestion, trendLabelHi } from '@/lib/trend';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/charts/trend-chart';
import { RangeTabs, rangeDays } from '@/components/range-tabs';
import type { SugarReading } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Exact replica of the /sugar page body, minus auth, for external probing. */
export default async function TestSugarClone({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
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
  const trend = detectTrend(rows.map((r) => Number(r.value)));
  const latest = rows.at(-1);

  return (
    <div className="space-y-4">
      <p>sugar-clone ok ({rows.length} rows)</p>
      <Card>
        <CardHeader>
          <CardTitle>Sugar Graph</CardTitle>
          <RangeTabs />
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            series={[{ key: 'value', label: 'Sugar (mg/dL)', color: '#e11d48' }]}
            referenceY={{ value: 180, label: 'Limit 180' }}
          />
        </CardContent>
      </Card>
      <Badge>{trendLabelHi(trend)}</Badge>
      <p>{sugarSuggestion(trend, latest ? Number(latest.value) : undefined)}</p>
    </div>
  );
}
