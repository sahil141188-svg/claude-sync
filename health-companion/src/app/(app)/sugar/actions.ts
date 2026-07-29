'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addSugarReading(formData: FormData) {
  const supabase = await createClient();
  const measuredAt = String(formData.get('measured_at') || '') || new Date().toISOString();
  const { error } = await supabase.from('sugar_readings').insert({
    value: Number(formData.get('value')),
    reading_type: String(formData.get('reading_type') || 'random'),
    measured_at: new Date(measuredAt).toISOString(),
    notes: String(formData.get('notes') || '') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/sugar');
  revalidatePath('/dashboard');
}
