'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils';
import type { ExtractedMedicine, MedicineSlot } from '@/lib/types';

/**
 * Apply extracted medicines from a prescription.
 * replaceExisting=true archives all current medicines first.
 */
export async function applyExtractedMedicines(prescriptionId: string, replaceExisting: boolean) {
  const supabase = await createClient();

  const { data: extractedRows, error: exErr } = await supabase
    .from('extracted_medicines')
    .select('*')
    .eq('prescription_id', prescriptionId)
    .eq('applied', false)
    .returns<ExtractedMedicine[]>();
  if (exErr) throw new Error(exErr.message);
  if (!extractedRows?.length) throw new Error('No extracted medicines to apply');

  const { data: prescription } = await supabase
    .from('prescription_files')
    .select('doctor_name')
    .eq('id', prescriptionId)
    .single();

  if (replaceExisting) {
    const { error } = await supabase
      .from('medicines')
      .update({ archived: true })
      .eq('archived', false);
    if (error) throw new Error(error.message);
  }

  const today = todayStr();
  const medicines = extractedRows.map((m) => {
    const slots: MedicineSlot[] = [];
    if (m.morning) slots.push('morning');
    if (m.afternoon) slots.push('afternoon');
    if (m.night) slots.push('night');
    if (slots.length === 0) slots.push('morning');
    const endDate = m.duration_days
      ? new Date(Date.now() + m.duration_days * 86_400_000).toISOString().slice(0, 10)
      : null;
    return {
      name: m.name,
      slots,
      quantity: m.dose ?? '1 tablet',
      start_date: today,
      end_date: endDate,
      doctor_name: prescription?.doctor_name ?? null,
      notes: 'Prescription से auto-added',
    };
  });

  const { error: insErr } = await supabase.from('medicines').insert(medicines);
  if (insErr) throw new Error(insErr.message);

  await supabase
    .from('extracted_medicines')
    .update({ applied: true })
    .eq('prescription_id', prescriptionId);

  revalidatePath('/medicines');
  revalidatePath('/prescriptions');
  revalidatePath('/dashboard');
}
