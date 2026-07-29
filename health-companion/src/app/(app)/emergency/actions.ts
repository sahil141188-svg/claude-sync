'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function addEmergencyContact(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('emergency_contacts').insert({
    label: String(formData.get('label') || 'Contact'),
    name: String(formData.get('name') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    kind: String(formData.get('kind') || 'other'),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/emergency');
}

export async function deleteEmergencyContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('emergency_contacts').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/emergency');
}
