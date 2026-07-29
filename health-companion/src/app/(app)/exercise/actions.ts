'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils';

// Rough calories per minute for an elderly adult, by activity.
const CAL_PER_MIN: Record<string, number> = {
  walking: 4,
  yoga: 3,
  cycling: 6,
  meditation: 1,
  other: 4,
};

export async function addExerciseLog(formData: FormData) {
  const supabase = await createClient();
  const type = String(formData.get('exercise_type') || 'walking');
  const duration = Number(formData.get('duration_min'));
  const { error } = await supabase.from('exercise_logs').insert({
    exercise_type: type,
    duration_min: duration,
    calories: Math.round(duration * (CAL_PER_MIN[type] ?? 4)),
    log_date: todayStr(),
    notes: String(formData.get('notes') || '') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/exercise');
  revalidatePath('/dashboard');
}
