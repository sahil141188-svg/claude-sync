import Link from 'next/link';
import {
  Activity,
  Droplet,
  Droplets,
  Dumbbell,
  HeartPulse,
  Lightbulb,
  Pill,
  Scale,
  Siren,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ensureTodayLogs } from '@/lib/medicine-schedule';
import { computeHealthScore } from '@/lib/health-score';
import { tipOfTheDay } from '@/lib/tips';
import { formatTime12, todayStr } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LiveClock } from '@/components/live-clock';
import { HealthScoreRing } from '@/components/health-score-ring';
import { MedicineTakenButton } from '@/components/medicine-taken-button';
import type { BpReading, MedicineLog, SugarReading, WaterLog, WeightReading, ExerciseLog } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await ensureTodayLogs();
  const supabase = await createClient();
  const today = todayStr();
  const dayStart = `${today}T00:00:00`;

  const [logsRes, sugarRes, bpRes, weightRes, waterRes, exerciseRes] = await Promise.all([
    supabase
      .from('medicine_logs')
      .select('*, medicines(*)')
      .eq('log_date', today)
      .order('scheduled_at'),
    supabase.from('sugar_readings').select('*').gte('measured_at', dayStart).order('measured_at', { ascending: false }),
    supabase.from('bp_readings').select('*').gte('measured_at', dayStart).order('measured_at', { ascending: false }),
    supabase.from('weight_readings').select('*').order('measured_at', { ascending: false }).limit(1),
    supabase.from('water_logs').select('*').eq('log_date', today).maybeSingle(),
    supabase.from('exercise_logs').select('*').eq('log_date', today),
  ]);

  const logs = (logsRes.data ?? []) as MedicineLog[];
  const sugar = (sugarRes.data ?? []) as SugarReading[];
  const bp = (bpRes.data ?? []) as BpReading[];
  const weight = (weightRes.data ?? []) as WeightReading[];
  const water = waterRes.data as WaterLog | null;
  const exercise = (exerciseRes.data ?? []) as ExerciseLog[];

  const taken = logs.filter((l) => l.taken).length;
  const medPct = logs.length ? Math.round((taken / logs.length) * 100) : 0;
  const { score } = computeHealthScore({ medicineLogs: logs, sugar, bp, water, exercise });

  const now = new Date();
  const upcoming = logs.filter((l) => !l.taken && new Date(l.scheduled_at) >= now).slice(0, 3);
  const exerciseMin = exercise.reduce((s, e) => s + e.duration_min, 0);
  const tip = tipOfTheDay();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <LiveClock />
        <Link
          href="/emergency"
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive text-white shadow-lg"
          aria-label="Emergency SOS"
        >
          <Siren className="h-8 w-8" />
        </Link>
      </div>

      {/* Health score + medicine progress */}
      <Card className="glass overflow-hidden">
        <CardContent className="flex items-center gap-4 p-5">
          <HealthScoreRing score={score} />
          <div className="flex-1">
            <p className="text-elder-base font-bold">आज का Health Score</p>
            <p className="mt-1 text-base text-muted-foreground">
              दवाइयाँ: {taken}/{logs.length} ली गईं
            </p>
            <Progress value={medPct} className="mt-2" barClassName="bg-success" />
          </div>
        </CardContent>
      </Card>

      {/* Today's vitals grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          href="/sugar"
          icon={<Droplet className="h-7 w-7" />}
          label="आज की Sugar"
          value={sugar[0] ? `${sugar[0].value}` : '—'}
          unit={sugar[0] ? 'mg/dL' : 'नहीं ली गई'}
          tone="text-rose-500"
        />
        <StatTile
          href="/bp"
          icon={<HeartPulse className="h-7 w-7" />}
          label="आज का BP"
          value={bp[0] ? `${bp[0].systolic}/${bp[0].diastolic}` : '—'}
          unit={bp[0] ? 'mmHg' : 'नहीं लिया गया'}
          tone="text-primary"
        />
        <StatTile
          href="/weight"
          icon={<Scale className="h-7 w-7" />}
          label="वज़न"
          value={weight[0] ? `${weight[0].weight_kg}` : '—'}
          unit={weight[0] ? 'kg' : 'दर्ज करें'}
          tone="text-secondary"
        />
        <StatTile
          href="/water"
          icon={<Droplets className="h-7 w-7" />}
          label="पानी"
          value={`${water?.glasses ?? 0}/${water?.goal_glasses ?? 8}`}
          unit="गिलास"
          tone="text-sky-500"
        />
        <StatTile
          href="/exercise"
          icon={<Dumbbell className="h-7 w-7" />}
          label="Exercise"
          value={`${exerciseMin}`}
          unit="मिनट"
          tone="text-amber-500"
        />
        <StatTile
          href="/analytics"
          icon={<Activity className="h-7 w-7" />}
          label="Analytics"
          value="देखें"
          unit="ट्रेंड और ग्राफ"
          tone="text-violet-500"
        />
      </div>

      {/* Upcoming medicines */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-elder-base font-bold">
              <Pill className="h-6 w-6 text-primary" /> अगली दवाइयाँ
            </p>
            <Link href="/medicines" className="text-base font-semibold text-primary">
              सभी देखें →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-2xl bg-success/10 p-4 text-center text-elder-base font-semibold text-success">
              {logs.length > 0 && taken === logs.length
                ? 'शाबाश! आज की सभी दवाइयाँ ली जा चुकी हैं ✅'
                : 'अभी कोई दवा बाकी नहीं है'}
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                  style={{ borderLeftWidth: 6, borderLeftColor: log.medicines?.color_tag }}
                >
                  <div>
                    <p className="text-elder-base font-bold">{log.medicines?.name}</p>
                    <p className="text-base text-muted-foreground">
                      {formatTime12(new Date(log.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}
                      {' · '}
                      {log.medicines?.quantity}
                    </p>
                  </div>
                  <MedicineTakenButton logId={log.id} taken={log.taken} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tip of the day */}
      <Card className="border-secondary/40 bg-secondary/5">
        <CardContent className="flex gap-3 p-5">
          <Lightbulb className="mt-1 h-7 w-7 shrink-0 text-secondary" />
          <div>
            <p className="font-bold text-secondary">
              आज की सलाह <Badge variant="success">{tip.topic}</Badge>
            </p>
            <p className="mt-1 text-elder-base">{tip.hi}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  href,
  icon,
  label,
  value,
  unit,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full transition-transform active:scale-[0.97]">
        <CardContent className="p-4">
          <span className={tone}>{icon}</span>
          <p className="mt-2 text-base font-semibold text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground">{unit}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
