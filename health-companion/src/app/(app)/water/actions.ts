'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayStr } from '@/lib/utils';

export async function adjustWater(delta: number) {
  const supabase = await createClient();
  const today = todayStr();

  const { data: existing } = await supabase
    .from('water_logs')
    .select('*')
    .eq('log_date', today)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('app_settings')
    .select('water_goal_glasses')
    .eq('id', 1)
    .single();
  const goal = settings?.water_goal_glasses ?? 8;

  const glasses = Math.max(0, (existing?.glasses ?? 0) + delta);
  const { error } = await supabase.from('water_logs').upsert(
    {
      log_date: today,
      glasses,
      goal_glasses: existing?.goal_glasses ?? goal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'log_date' }
  );
  if (error) throw new Error(error.message);
  revalidatePath('/water');
  revalidatePath('/dashboard');
}
