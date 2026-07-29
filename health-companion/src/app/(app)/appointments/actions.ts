'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addAppointment(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('doctor_visits').insert({
    doctor_name: String(formData.get('doctor_name') || '').trim(),
    visit_date: String(formData.get('visit_date') || ''),
    visit_time: String(formData.get('visit_time') || '') || null,
    notes: String(formData.get('notes') || '') || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/appointments');
  revalidatePath('/dashboard');
}

export async function deleteAppointment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('doctor_visits').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/appointments');
  revalidatePath('/dashboard');
}
