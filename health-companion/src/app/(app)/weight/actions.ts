'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calcBmi } from '@/lib/utils';

export async function addWeightReading(formData: FormData) {
  const supabase = await createClient();
  const weightKg = Number(formData.get('weight_kg'));
  const heightCm = formData.get('height_cm') ? Number(formData.get('height_cm')) : null;
  const { error } = await supabase.from('weight_readings').insert({
    weight_kg: weightKg,
    height_cm: heightCm,
    bmi: calcBmi(weightKg, heightCm),
    measured_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/weight');
  revalidatePath('/dashboard');
}
