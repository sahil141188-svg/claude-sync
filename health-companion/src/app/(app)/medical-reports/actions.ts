'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function deleteMedicalReport(id: string, filePath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('medical_reports').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await supabase.storage.from('medical-reports').remove([filePath]);
  revalidatePath('/medical-reports');
}
