import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PrintButton } from './print-button';
import type {
  AiReport,
  BpReading,
  DoctorVisit,
  Medicine,
  MedicineLog,
  SugarReading,
  WeightReading,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Printable 30-day health report. "Download PDF" uses the browser's
 * print-to-PDF, which works offline and on every phone.
 */
export default async function ReportsPage() {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sinceDate = since.slice(0, 10);

  const [sugarRes, bpRes, weightRes, medsRes, logsRes, reportRes, visitsRes] = await Promise.all([
    supabase.from('sugar_readings').select('*').gte('measured_at', since).order('measured_at', { ascending: false }),
    supabase.from('bp_readings').select('*').gte('measured_at', since).order('measured_at', { ascending: false }),
    supabase.from('weight_readings').select('*').gte('measured_at', since).order('measured_at', { ascending: false }),
    supabase.from('medicines').select('*').eq('archived', false),
    supabase.from('medicine_logs').select('*').gte('log_date', sinceDate),
    supabase.from('ai_reports').select('*').order('report_date', { ascending: false }).limit(1),
    supabase.from('doctor_visits').select('*').order('visit_date', { ascending: false }).limit(5),
  ]);

  const sugar = (sugarRes.data ?? []) as SugarReading[];
  const bp = (bpRes.data ?? []) as BpReading[];
  const weight = (weightRes.data ?? []) as WeightReading[];
  const meds = (medsRes.data ?? []) as Medicine[];
  const logs = (logsRes.data ?? []) as MedicineLog[];
  const report = (reportRes.data?.[0] ?? null) as AiReport | null;
  const visits = (visitsRes.data ?? []) as DoctorVisit[];

  const taken = logs.filter((l) => l.taken).length;
  const compliance = logs.length ? Math.round((taken / logs.length) * 100) : 0;
  const avg = (nums: number[]) =>
    nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="no-print flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-elder-xl font-bold">
          <FileText className="h-8 w-8 text-rose-500" /> Report
        </h1>
        <PrintButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health Report — पिछले 30 दिन</CardTitle>
          <p className="text-sm text-muted-foreground">
            बनी: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Medicine compliance" value={`${compliance}%`} />
            <Stat label="औसत Sugar" value={avg(sugar.map((s) => Number(s.value)))?.toString() ?? '—'} suffix="mg/dL" />
            <Stat
              label="औसत BP"
              value={
                bp.length
                  ? `${avg(bp.map((b) => b.systolic))}/${avg(bp.map((b) => b.diastolic))}`
                  : '—'
              }
              suffix="mmHg"
            />
            <Stat label="वज़न" value={weight[0] ? `${weight[0].weight_kg}` : '—'} suffix="kg" />
          </div>

          {report && (
            <div className="rounded-2xl bg-primary/5 p-4">
              <p className="font-bold">
                AI Summary{' '}
                <Badge
                  variant={
                    report.status === 'improving'
                      ? 'success'
                      : report.status === 'critical'
                        ? 'destructive'
                        : 'warning'
                  }
                >
                  {report.status.replace('_', ' ')}
                </Badge>
              </p>
              <p className="mt-1 text-elder-base">{report.summary}</p>
              <ul className="mt-2 list-inside list-disc text-base">
                {report.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportTable
        title="Medicine History (चल रही दवाइयाँ)"
        headers={['दवा', 'समय', 'मात्रा', 'Doctor']}
        rows={meds.map((m) => [
          m.name,
          m.slots.join(', '),
          m.quantity,
          m.doctor_name ?? '—',
        ])}
      />
      <ReportTable
        title="Sugar Readings"
        headers={['तारीख़', 'Value (mg/dL)', 'प्रकार', 'Notes']}
        rows={sugar.slice(0, 20).map((s) => [
          fmtDate(s.measured_at),
          String(s.value),
          s.reading_type,
          s.notes ?? '—',
        ])}
      />
      <ReportTable
        title="BP Readings"
        headers={['तारीख़', 'Systolic', 'Diastolic', 'Pulse']}
        rows={bp.slice(0, 20).map((b) => [
          fmtDate(b.measured_at),
          String(b.systolic),
          String(b.diastolic),
          b.pulse ? String(b.pulse) : '—',
        ])}
      />
      <ReportTable
        title="Weight"
        headers={['तारीख़', 'Weight (kg)', 'BMI']}
        rows={weight.slice(0, 10).map((w) => [
          fmtDate(w.measured_at),
          String(w.weight_kg),
          w.bmi ? String(w.bmi) : '—',
        ])}
      />
      {visits.length > 0 && (
        <ReportTable
          title="Doctor Visits"
          headers={['तारीख़', 'Doctor', 'Notes']}
          rows={visits.map((v) => [
            fmtDate(v.visit_date + 'T00:00:00'),
            v.doctor_name,
            v.notes ?? '—',
          ])}
        />
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3 text-center">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-elder-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-base text-muted-foreground">कोई data नहीं</p>
        ) : (
          <table className="w-full text-left text-base">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                {headers.map((h) => (
                  <th key={h} className="py-2 pr-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-3">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
