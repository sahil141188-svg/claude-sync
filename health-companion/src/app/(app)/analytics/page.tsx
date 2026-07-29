import { BarChart3, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/health-score';
import { todayStr } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HealthScoreRing } from '@/components/health-score-ring';
import { TrendChart } from '@/components/charts/trend-chart';
import { ComplianceBarChart, DistributionPieChart } from '@/components/charts/bar-pie';
import { RangeTabs, rangeDays } from '@/components/range-tabs';
import type {
  AiReport,
  BpReading,
  ExerciseLog,
  MedicineLog,
  SugarReading,
  WaterLog,
  WeightReading,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  improving: { label: 'Health Improving 💚', variant: 'success' },
  needs_attention: { label: 'Needs Attention ⚠️', variant: 'warning' },
  critical: { label: 'Critical ❗', variant: 'destructive' },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = 'weekly' } = await searchParams;
  const supabase = await createClient();
  const days = rangeDays(range);
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  const sinceDate = sinceIso.slice(0, 10);
  const today = todayStr();

  const [sugarRes, bpRes, weightRes, logsRes, waterRes, exerciseRes, reportRes, todayWaterRes] =
    await Promise.all([
      supabase.from('sugar_readings').select('*').gte('measured_at', sinceIso).order('measured_at'),
      supabase.from('bp_readings').select('*').gte('measured_at', sinceIso).order('measured_at'),
      supabase.from('weight_readings').select('*').gte('measured_at', sinceIso).order('measured_at'),
      supabase.from('medicine_logs').select('*').gte('log_date', sinceDate),
      supabase.from('water_logs').select('*').gte('log_date', sinceDate).order('log_date'),
      supabase.from('exercise_logs').select('*').gte('log_date', sinceDate),
      supabase.from('ai_reports').select('*').order('report_date', { ascending: false }).limit(1),
      supabase.from('water_logs').select('*').eq('log_date', today).maybeSingle(),
    ]);

  const sugar = (sugarRes.data ?? []) as SugarReading[];
  const bp = (bpRes.data ?? []) as BpReading[];
  const weightRows = (weightRes.data ?? []) as WeightReading[];
  const logs = (logsRes.data ?? []) as MedicineLog[];
  const waterRows = (waterRes.data ?? []) as WaterLog[];
  const exercise = (exerciseRes.data ?? []) as ExerciseLog[];
  const report = (reportRes.data?.[0] ?? null) as AiReport | null;

  const todayLogs = logs.filter((l) => l.log_date === today);
  const { score } = computeHealthScore({
    medicineLogs: todayLogs,
    sugar: sugar.filter((s) => s.measured_at >= `${today}T00:00:00`),
    bp: bp.filter((b) => b.measured_at >= `${today}T00:00:00`),
    water: (todayWaterRes.data as WaterLog | null) ?? null,
    exercise: exercise.filter((e) => e.log_date === today),
  });

  const dayLabel = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const complianceByDay = new Map<string, { taken: number; missed: number }>();
  for (const l of logs) {
    const entry = complianceByDay.get(l.log_date) ?? { taken: 0, missed: 0 };
    if (l.taken) entry.taken += 1;
    else entry.missed += 1;
    complianceByDay.set(l.log_date, entry);
  }
  const complianceData = [...complianceByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([d, v]) => ({ label: dayLabel(d), ...v }));

  const exerciseMix = Object.entries(
    exercise.reduce<Record<string, number>>((acc, e) => {
      acc[e.exercise_type] = (acc[e.exercise_type] ?? 0) + e.duration_min;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const measurementLabel = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <BarChart3 className="h-8 w-8 text-violet-500" /> Analytics
      </h1>

      <RangeTabs />

      <Card className="glass">
        <CardContent className="flex items-center gap-4 p-5">
          <HealthScoreRing score={report?.health_score ?? score} />
          <div className="flex-1 space-y-2">
            <p className="text-elder-base font-bold">Health Score</p>
            {report ? (
              <>
                <Badge variant={STATUS_META[report.status]?.variant ?? 'muted'}>
                  {STATUS_META[report.status]?.label ?? report.status}
                </Badge>
                <p className="text-base text-muted-foreground">{report.summary}</p>
              </>
            ) : (
              <p className="text-base text-muted-foreground">
                रात का AI विश्लेषण अभी नहीं बना है — आज के data से live score दिख रहा है।
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {report && report.recommendations.length > 0 && (
        <Card className="border-secondary/40 bg-secondary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-elder-base">
              <Sparkles className="h-6 w-6 text-secondary" /> AI की सलाह
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-elder-base">
              {report.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sugar Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={sugar.map((r) => ({ label: measurementLabel(r.measured_at), value: Number(r.value) }))}
            series={[{ key: 'value', label: 'Sugar', color: '#e11d48' }]}
            referenceY={{ value: 180, label: '180' }}
            height={220}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>BP Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={bp.map((r) => ({
              label: measurementLabel(r.measured_at),
              systolic: r.systolic,
              diastolic: r.diastolic,
            }))}
            series={[
              { key: 'systolic', label: 'Systolic', color: '#1d6fd1' },
              { key: 'diastolic', label: 'Diastolic', color: '#10b981' },
            ]}
            referenceY={{ value: 140, label: '140' }}
            height={220}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={weightRows.map((r) => ({
              label: measurementLabel(r.measured_at),
              weight: Number(r.weight_kg),
            }))}
            series={[{ key: 'weight', label: 'Weight (kg)', color: '#8b5cf6' }]}
            height={220}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medicine Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceBarChart data={complianceData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Water Intake</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceBarChart
            data={waterRows.slice(-14).map((w) => ({
              label: dayLabel(w.log_date),
              taken: w.glasses,
              missed: Math.max(0, w.goal_glasses - w.glasses),
            }))}
          />
          <p className="mt-1 text-center text-sm text-muted-foreground">
            हरा = पिए गिलास, लाल = लक्ष्य से बाकी
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exercise Mix (मिनट)</CardTitle>
        </CardHeader>
        <CardContent>
          <DistributionPieChart data={exerciseMix} />
        </CardContent>
      </Card>
    </div>
  );
}
