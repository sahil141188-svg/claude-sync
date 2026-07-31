import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { ensureTodayLogs } from '@/lib/medicine-schedule';
import { quoteOfTheDay } from '@/lib/quotes';
import { tipOfTheDay } from '@/lib/tips';
import { todayStr } from '@/lib/utils';
import { patientNumber, sendWhatsApp } from '@/lib/whatsapp';

export const maxDuration = 60;

/**
 * Runs three times a day (?slot=morning|afternoon|night, vercel.json).
 * Morning: greeting + quote + today's tip, seeds health_tips, creates today's logs.
 * Afternoon: greeting + water nudge.
 * Night: greeting + daily health summary.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slot = new URL(request.url).searchParams.get('slot') ?? 'morning';
  const admin = createAdminClient();
  const today = todayStr();

  let message: string;

  if (slot === 'morning') {
    await ensureTodayLogs();
    const tip = tipOfTheDay();
    await admin
      .from('health_tips')
      .upsert(
        { tip_date: today, topic: tip.topic, tip_hi: tip.hi, tip_en: tip.en },
        { onConflict: 'tip_date' }
      );

    const { data: appointments } = await admin
      .from('doctor_visits')
      .select('doctor_name, visit_time')
      .eq('visit_date', today);
    const appointmentLine = (appointments ?? [])
      .map(
        (a) =>
          `\n🩺 Aaj appointment: Dr. ${a.doctor_name}${a.visit_time ? ` (${a.visit_time.slice(0, 5)})` : ''}`
      )
      .join('');

    message =
      `Good Morning Papa ❤️\n\n"${quoteOfTheDay('hi')}"\n\n` +
      `आज की सलाह (${tip.topic}): ${tip.hi}` +
      appointmentLine +
      `\n\nApp kholkar aaj ki dawai zaroor dekh lijiye. Stay healthy ❤️`;
  } else if (slot === 'afternoon') {
    message =
      `Good Afternoon Papa ❤️\n\n` +
      `Paani peena mat bhooliye — din mein 8 glass ka lakshya hai. 💧\n` +
      `Dopahar ki dawai ka time bhi dekh lijiye.`;
  } else {
    const [logsRes, sugarRes, bpRes, waterRes] = await Promise.all([
      admin.from('medicine_logs').select('taken').eq('log_date', today),
      admin.from('sugar_readings').select('value').gte('measured_at', `${today}T00:00:00`),
      admin.from('bp_readings').select('systolic,diastolic').gte('measured_at', `${today}T00:00:00`),
      admin.from('water_logs').select('glasses,goal_glasses').eq('log_date', today).maybeSingle(),
    ]);
    const logs = logsRes.data ?? [];
    const taken = logs.filter((l) => l.taken).length;
    const sugar = sugarRes.data?.[0];
    const bp = bpRes.data?.[0];
    const water = waterRes.data;

    message =
      `Good Night Papa ❤️\n\nAaj ka summary:\n` +
      `💊 Dawai: ${taken}/${logs.length}\n` +
      `🩸 Sugar: ${sugar ? `${sugar.value} mg/dL` : 'nahi li gayi'}\n` +
      `❤️ BP: ${bp ? `${bp.systolic}/${bp.diastolic}` : 'nahi liya gaya'}\n` +
      `💧 Paani: ${water ? `${water.glasses}/${water.goal_glasses} glass` : '0 glass'}\n\n` +
      `Achhi neend lijiye. Shubh Ratri ❤️`;
  }

  const result = await sendWhatsApp(await patientNumber(), message, `daily_${slot}`);
  return NextResponse.json({ slot, sent: result.success });
}
