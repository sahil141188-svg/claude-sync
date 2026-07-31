import { Droplet } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { detectTrend, sugarSuggestion, trendLabelHi } from '@/lib/trend';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/charts/trend-chart';
import { RangeTabs, rangeDays } from '@/components/range-tabs';
import { ReadingForm } from './reading-form';
import type { SugarReading } from '@/lib/types';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  fasting: 'Fasting (खाली पेट)',
  pp: 'PP (खाने के बाद)',
  random: 'Random',
};

export default async function SugarPage(props: {
  searchParams: Promise<{ range?: string }>;
}) {
  // Temporary instrumentation: surface the real error text instead of the
  // generic boundary while we chase a production-only crash on this page.
  try {
    return await SugarPageBody(props);
  } catch (err) {
    const digest = (err as { digest?: string })?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw err;
    return (
      <div className="space-y-3">
        <h1 className="text-elder-lg font-bold">Sugar — debug info</h1>
        <p className="text-base text-muted-foreground">
          यह screenshot भेज दीजिए — इससे exact problem पता चल जाएगी।
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl bg-muted p-4 text-xs">
          {err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)}
        </pre>
      </div>
    );
  }
}

async function SugarPageBody({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = 'weekly' } = await searchParams;
  const { supabase, isCaregiver } = await requireProfile();

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
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Droplet className="h-8 w-8 text-rose-500" /> Sugar
      </h1>

      {isCaregiver && <ReadingForm />}

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

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 p-5">
          <p className="text-elder-base font-bold">
            Trend: <Badge>{trendLabelHi(trend)}</Badge>
          </p>
          <p className="text-elder-base">{sugarSuggestion(trend, latest ? Number(latest.value) : undefined)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>हाल की readings</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-elder-base text-muted-foreground">इस अवधि में कोई reading नहीं है।</p>
          ) : (
            <ul className="space-y-2">
              {[...rows].reverse().slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-2xl bg-muted/50 p-3">
                  <div>
                    <p className="text-elder-base font-bold tabular-nums">{r.value} mg/dL</p>
                    <p className="text-sm text-muted-foreground">
                      {TYPE_LABEL[r.reading_type]} ·{' '}
                      {new Date(r.measured_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge variant={Number(r.value) > 180 ? 'destructive' : 'success'}>
                    {Number(r.value) > 180 ? 'High' : 'OK'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
