'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { AppSettings } from '@/lib/types';

export async function updateSettings(patch: Partial<Omit<AppSettings, 'id'>>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('hc_app_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}
