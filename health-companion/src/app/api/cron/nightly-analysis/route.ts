import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { analyzeHealth } from '@/lib/ai';
import { computeHealthScore, scoreStatus } from '@/lib/health-score';
import { nowInAppTz, todayStr } from '@/lib/utils';
import { patientNumber, sendWhatsApp, sendWhatsAppToFamily } from '@/lib/whatsapp';

export const maxDuration = 60;

/**
 * Runs nightly (vercel.json). Builds a 7-day data summary, asks the AI for an
 * analysis, stores it in ai_reports, and WhatsApps the caregiver.
 * On Sundays it also sends a weekly report to the patient.
 * Falls back to the rule-based health score if no AI key is configured.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = todayStr();
  const weekAgoIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const weekAgoDate = weekAgoIso.slice(0, 10);

  const [sugarRes, bpRes, weightRes, logsRes, waterRes, exerciseRes, todayWaterRes] =
    await Promise.all([
      admin.from('sugar_readings').select('*').gte('measured_at', weekAgoIso).order('measured_at'),
      admin.from('bp_readings').select('*').gte('measured_at', weekAgoIso).order('measured_at'),
      admin.from('weight_readings').select('*').gte('measured_at', weekAgoIso).order('measured_at'),
      admin.from('medicine_logs').select('*').gte('log_date', weekAgoDate),
      admin.from('water_logs').select('*').gte('log_date', weekAgoDate),
      admin.from('exercise_logs').select('*').gte('log_date', weekAgoDate),
      admin.from('water_logs').select('*').eq('log_date', today).maybeSingle(),
    ]);

  const sugar = sugarRes.data ?? [];
  const bp = bpRes.data ?? [];
  const weight = weightRes.data ?? [];
  const logs = logsRes.data ?? [];
  const water = waterRes.data ?? [];
  const exercise = exerciseRes.data ?? [];

  const taken = logs.filter((l) => l.taken).length;
  const compliancePct = logs.length ? Math.round((taken / logs.length) * 100) : 100;
  const exerciseMin = exercise.reduce((s, e) => s + e.duration_min, 0);

  const { score } = computeHealthScore({
    medicineLogs: logs.filter((l) => l.log_date === today),
    sugar: sugar.filter((s) => s.measured_at >= `${today}T00:00:00`),
    bp: bp.filter((b) => b.measured_at >= `${today}T00:00:00`),
    water: todayWaterRes.data ?? null,
    exercise: exercise.filter((e) => e.log_date === today),
  });

  const dataSummary = [
    `Sugar readings (mg/dL): ${sugar.map((s) => `${s.value} (${s.reading_type})`).join(', ') || 'none'}`,
    `BP readings: ${bp.map((b) => `${b.systolic}/${b.diastolic}`).join(', ') || 'none'}`,
    `Weight (kg): ${weight.map((w) => w.weight_kg).join(', ') || 'none'}`,
    `Medicine compliance: ${taken}/${logs.length} doses taken (${compliancePct}%)`,
    `Water: ${water.map((w) => `${w.glasses}/${w.goal_glasses}`).join(', ') || 'none'}`,
    `Exercise total: ${exerciseMin} minutes over 7 days`,
  ].join('\n');

  let status: 'improving' | 'needs_attention' | 'critical' = scoreStatus(score);
  let summary = `पिछले 7 दिनों में दवा compliance ${compliancePct}% रही। आज का health score ${score}/100 है।`;
  let recommendations: string[] = [
    'रोज़ 30 मिनट टहलें',
    'दिन में 8 गिलास पानी पिएँ',
    'दवाइयाँ समय पर लें',
  ];
  let raw: unknown = null;

  try {
    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      const ai = await analyzeHealth(dataSummary);
      status = ai.status;
      summary = ai.summary;
      recommendations = ai.recommendations;
      raw = ai;
    }
  } catch (err) {
    raw = { ai_error: String(err) };
  }

  await admin.from('ai_reports').upsert(
    {
      report_date: today,
      status,
      health_score: score,
      summary,
      recommendations,
      raw,
    },
    { onConflict: 'report_date' }
  );

  await admin.from('notifications').insert({
    title:
      status === 'improving'
        ? 'Health Improving 💚'
        : status === 'critical'
          ? 'Critical ❗ डॉक्टर से मिलें'
          : 'Needs Attention ⚠️',
    body: summary,
    category: 'ai_report',
    target_role: 'caregiver',
  });

  await sendWhatsAppToFamily(
    `📊 Papa ka daily health report\n\nStatus: ${status.replace('_', ' ')}\nScore: ${score}/100\n\n${summary}\n\nSujhaav:\n${recommendations.map((r) => `• ${r}`).join('\n')}`,
    'daily_report'
  );

  // Weekly report to the patient every Sunday night.
  if (nowInAppTz().getDay() === 0) {
    await sendWhatsApp(
      patientNumber(),
      `Papa, is hafte ka health report ❤️\n\nDawai compliance: ${compliancePct}%\nExercise: ${exerciseMin} minute\nScore: ${score}/100\n\n${summary}`,
      'weekly_report'
    );
  }

  return NextResponse.json({ status, score, compliancePct });
}
