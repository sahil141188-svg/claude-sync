import { Scale } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendChart } from '@/components/charts/trend-chart';
import { WeightForm } from './weight-form';
import type { Profile, WeightReading } from '@/lib/types';

export const dynamic = 'force-dynamic';

function changeOver(rows: WeightReading[], days: number): number | null {
  if (rows.length < 2) return null;
  const latest = rows[rows.length - 1];
  const cutoff = Date.now() - days * 86_400_000;
  const past = rows.find((r) => new Date(r.measured_at).getTime() >= cutoff);
  if (!past || past.id === latest.id) return null;
  return Math.round((Number(latest.weight_kg) - Number(past.weight_kg)) * 10) / 10;
}

export default async function WeightPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 180 * 86_400_000).toISOString();
  const [{ data: readings }, userRes] = await Promise.all([
    supabase.from('weight_readings').select('*').gte('measured_at', since).order('measured_at'),
    supabase.auth.getUser(),
  ]);
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userRes.data.user!.id)
    .single<Pick<Profile, 'role'>>();

  const rows = (readings ?? []) as WeightReading[];
  const latest = rows.at(-1);
  const weekly = changeOver(rows, 7);
  const monthly = changeOver(rows, 30);

  const chartData = rows.map((r) => ({
    label: new Date(r.measured_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    weight: Number(r.weight_kg),
  }));

  const fmt = (n: number | null) =>
    n === null ? '—' : `${n > 0 ? '+' : ''}${n} kg`;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Scale className="h-8 w-8 text-secondary" /> वज़न
      </h1>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">अभी</p>
            <p className="text-2xl font-bold tabular-nums">{latest ? `${latest.weight_kg}` : '—'}</p>
            <p className="text-sm text-muted-foreground">kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">BMI</p>
            <p className="text-2xl font-bold tabular-nums">{latest?.bmi ?? '—'}</p>
            {latest?.bmi && (
              <Badge variant={latest.bmi < 18.5 || latest.bmi >= 27 ? 'warning' : 'success'}>
                {latest.bmi < 18.5 ? 'कम' : latest.bmi < 25 ? 'सही' : latest.bmi < 30 ? 'ज़्यादा' : 'बहुत ज़्यादा'}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground">हफ़्ते में</p>
            <p className="text-2xl font-bold tabular-nums">{fmt(weekly)}</p>
            <p className="text-sm text-muted-foreground">महीने में {fmt(monthly)}</p>
          </CardContent>
        </Card>
      </div>

      {profile?.role === 'caregiver' && <WeightForm lastHeight={latest?.height_cm ?? null} />}

      <Card>
        <CardHeader>
          <CardTitle>वज़न का Graph (6 महीने)</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={chartData}
            series={[{ key: 'weight', label: 'Weight (kg)', color: '#10b981' }]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
