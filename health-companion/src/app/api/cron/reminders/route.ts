import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureTodayLogs } from '@/lib/medicine-schedule';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { todayStr, slotLabel } from '@/lib/utils';
import {
  caregiverNumber,
  medicineReminderMessage,
  missedMedicineAlert,
  patientNumber,
  sendWhatsApp,
} from '@/lib/whatsapp';
import type { Medicine, MedicineLog } from '@/lib/types';

export const maxDuration = 60;

/**
 * Runs every 15 minutes (vercel.json).
 * Escalation for each unmarked medicine:
 *   +15 min → WhatsApp reminder to patient
 *   +45 min → second WhatsApp reminder
 *   +90 min → WhatsApp alert to caregiver + in-app notification
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureTodayLogs();
  const admin = createAdminClient();
  const now = Date.now();

  const { data } = await admin
    .from('medicine_logs')
    .select('*, medicines(*)')
    .eq('log_date', todayStr())
    .eq('taken', false);

  const logs = (data ?? []) as (MedicineLog & { medicines: Medicine })[];
  const results: Record<string, string>[] = [];

  for (const log of logs) {
    const minutesLate = (now - new Date(log.scheduled_at).getTime()) / 60000;
    const name = log.medicines?.name ?? 'दवा';
    const slotHi = slotLabel(log.slot);

    if (minutesLate >= 90 && !log.caregiver_alert_sent) {
      await sendWhatsApp(caregiverNumber(), missedMedicineAlert(name, slotHi), 'missed_alert');
      await admin.from('notifications').insert({
        title: 'दवा छूट गई ⚠️',
        body: `${slotHi} की दवा "${name}" 90 मिनट से नहीं ली गई है।`,
        category: 'missed_medicine',
        target_role: 'caregiver',
      });
      await admin
        .from('medicine_logs')
        .update({ caregiver_alert_sent: true, reminder_45_sent: true, reminder_15_sent: true })
        .eq('id', log.id);
      results.push({ medicine: name, action: 'caregiver_alert' });
    } else if (minutesLate >= 45 && !log.reminder_45_sent) {
      await sendWhatsApp(patientNumber(), medicineReminderMessage(name, slotHi), 'reminder_45');
      await admin
        .from('medicine_logs')
        .update({ reminder_45_sent: true, reminder_15_sent: true })
        .eq('id', log.id);
      results.push({ medicine: name, action: 'reminder_45' });
    } else if (minutesLate >= 15 && !log.reminder_15_sent) {
      await sendWhatsApp(patientNumber(), medicineReminderMessage(name, slotHi), 'reminder_15');
      await admin.from('medicine_logs').update({ reminder_15_sent: true }).eq('id', log.id);
      results.push({ medicine: name, action: 'reminder_15' });
    }
  }

  return NextResponse.json({ checked: logs.length, sent: results });
}
