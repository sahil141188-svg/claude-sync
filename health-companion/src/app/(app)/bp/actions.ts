'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addBpReading(formData: FormData) {
  const supabase = await createClient();
  const measuredAt = String(formData.get('measured_at') || '') || new Date().toISOString();
  const dayPeriod = String(formData.get('day_period') || '');
  const { error } = await supabase.from('bp_readings').insert({
    systolic: Number(formData.get('systolic')),
    diastolic: Number(formData.get('diastolic')),
    pulse: formData.get('pulse') ? Number(formData.get('pulse')) : null,
    day_period: dayPeriod === 'morning' || dayPeriod === 'evening' ? dayPeriod : null,
    measured_at: new Date(measuredAt).toISOString(),
    notes: String(formData.get('notes') || '') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/bp');
  revalidatePath('/dashboard');
}
