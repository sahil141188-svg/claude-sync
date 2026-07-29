'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { MedicineSlot } from '@/lib/types';

function parseMedicineForm(formData: FormData) {
  const slots: MedicineSlot[] = [];
  for (const slot of ['morning', 'afternoon', 'night', 'custom'] as const) {
    if (formData.get(`slot_${slot}`) === 'on') slots.push(slot);
  }
  const customTime = String(formData.get('custom_time') || '');
  return {
    name: String(formData.get('name') || '').trim(),
    slots,
    custom_time: slots.includes('custom') && customTime ? customTime : null,
    food_relation: String(formData.get('food_relation') || 'any'),
    quantity: String(formData.get('quantity') || '1 tablet'),
    start_date: String(formData.get('start_date') || new Date().toISOString().slice(0, 10)),
    end_date: String(formData.get('end_date') || '') || null,
    notes: String(formData.get('notes') || '') || null,
    color_tag: String(formData.get('color_tag') || '#2563eb'),
    doctor_name: String(formData.get('doctor_name') || '') || null,
    stock_count: formData.get('stock_count') ? Number(formData.get('stock_count')) : null,
    expiry_date: String(formData.get('expiry_date') || '') || null,
  };
}

export async function createMedicine(formData: FormData) {
  const supabase = await createClient();
  const payload = parseMedicineForm(formData);
  if (!payload.name || payload.slots.length === 0) {
    throw new Error('Medicine name and at least one time slot are required');
  }
  const { error } = await supabase.from('medicines').insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath('/medicines');
  revalidatePath('/dashboard');
  redirect('/medicines');
}

export async function updateMedicine(id: string, formData: FormData) {
  const supabase = await createClient();
  const payload = parseMedicineForm(formData);
  const { error } = await supabase.from('medicines').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/medicines');
  revalidatePath('/dashboard');
  redirect('/medicines');
}

export async function archiveMedicine(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('medicines').update({ archived: true }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/medicines');
  revalidatePath('/dashboard');
}
