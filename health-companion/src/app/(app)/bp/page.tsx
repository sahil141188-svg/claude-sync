import { HeartPulse } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { bpSuggestion, detectTrend, trendLabelHi } from '@/lib/trend';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/charts/trend-chart';
import { RangeTabs, rangeDays } from '@/components/range-tabs';
import { BpForm } from './bp-form';
import type { BpReading } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BpPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = 'weekly' } = await searchParams;
  const { supabase, isCaregiver } = await requireProfile();

  const since = new Date(Date.now() - rangeDays(range) * 86_400_000).toISOString();
  const { data: readings } = await supabase
    .from('bp_readings')
    .select('*')
    .gte('measured_at', since)
    .order('measured_at');

  const rows = (readings ?? []) as BpReading[];
  const chartData = rows.map((r) => ({
    label: new Date(r.measured_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    systolic: r.systolic,
    diastolic: r.diastolic,
    pulse: r.pulse,
  }));
  const trend = detectTrend(rows.map((r) => r.systolic));
  const latest = rows.at(-1);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <HeartPulse className="h-8 w-8 text-primary" /> Blood Pressure
      </h1>

      {isCaregiver && <BpForm />}

      <Card>
        <CardHeader>
          <CardTitle>BP Graph</CardTitle>
          <RangeTabs exclude={['yearly']} />
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            series={[
              { key: 'systolic', label: 'Systolic', color: '#1d6fd1' },
              { key: 'diastolic', label: 'Diastolic', color: '#10b981' },
              { key: 'pulse', label: 'Pulse', color: '#f59e0b' },
            ]}
            referenceY={{ value: 140, label: 'Limit 140' }}
          />
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 p-5">
          <p className="text-elder-base font-bold">
            Trend: <Badge>{trendLabelHi(trend)}</Badge>
          </p>
          <p className="text-elder-base">{bpSuggestion(trend, latest?.systolic)}</p>
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
                    <p className="text-elder-base font-bold tabular-nums">
                      {r.systolic}/{r.diastolic} mmHg
                      {r.pulse ? ` · ${r.pulse} bpm` : ''}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(r.measured_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <Badge variant={r.systolic >= 140 || r.diastolic >= 90 ? 'destructive' : 'success'}>
                    {r.systolic >= 140 || r.diastolic >= 90 ? 'High' : 'OK'}
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
