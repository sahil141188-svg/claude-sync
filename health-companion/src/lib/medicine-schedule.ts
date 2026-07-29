import { createAdminClient } from './supabase/admin';
import { APP_TZ, SLOT_TIMES, todayStr } from './utils';
import type { Medicine, MedicineSlot } from './types';

/** UTC timestamp for a wall-clock HH:MM today in the app timezone. */
export function scheduledAtFor(dateStr: string, hhmm: string): string {
  // Compute the app-timezone UTC offset for that date, then build an ISO string.
  const probe = new Date(`${dateStr}T12:00:00Z`);
  const tzDate = new Date(probe.toLocaleString('en-US', { timeZone: APP_TZ }));
  const offsetMin = Math.round((tzDate.getTime() - probe.getTime()) / 60000);
  const [h, m] = hhmm.split(':').map(Number);
  const utc = Date.UTC(
    Number(dateStr.slice(0, 4)),
    Number(dateStr.slice(5, 7)) - 1,
    Number(dateStr.slice(8, 10)),
    h,
    m
  );
  return new Date(utc - offsetMin * 60000).toISOString();
}

/**
 * Ensure medicine_logs rows exist for every active medicine slot today.
 * Idempotent (unique constraint + upsert-ignore). Runs with the service role
 * so it works no matter which user opens the app first.
 */
export async function ensureTodayLogs(): Promise<void> {
  const admin = createAdminClient();
  const today = todayStr();

  const { data: medicines } = await admin
    .from('medicines')
    .select('*')
    .eq('archived', false)
    .lte('start_date', today)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .returns<Medicine[]>();

  if (!medicines?.length) return;

  const rows = medicines.flatMap((med) =>
    med.slots.map((slot: MedicineSlot) => {
      const hhmm =
        slot === 'custom' ? (med.custom_time ?? '12:00').slice(0, 5) : SLOT_TIMES[slot];
      return {
        medicine_id: med.id,
        log_date: today,
        slot,
        scheduled_at: scheduledAtFor(today, hhmm),
      };
    })
  );

  if (rows.length) {
    await admin
      .from('medicine_logs')
      .upsert(rows, { onConflict: 'medicine_id,log_date,slot', ignoreDuplicates: true });
  }
}
