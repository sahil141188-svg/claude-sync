'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { resendMessage } from '@/lib/messages';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTemplateKey } from '@/lib/templates';

export async function resend(id: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const result = await resendMessage(createAdminClient(), id);
  revalidatePath('/dashboard', 'layout');
  switch (result.outcome) {
    case 'sent':
      return { ok: true, message: 'Sent' };
    case 'retry':
      return { ok: false, message: `Failed again, will retry in 60 seconds: ${result.detail}` };
    case 'skipped':
    case 'cancelled':
      return { ok: false, message: `Not sent: ${result.detail}` };
    default:
      return { ok: false, message: result.detail ?? 'Could not resend' };
  }
}

export async function setTemplateEnabled(key: string, enabled: boolean): Promise<{ ok: boolean }> {
  const { supabase } = await requireAdmin();
  if (!isTemplateKey(key)) return { ok: false };
  const { data } = await supabase.from('settings').select('value').eq('key', 'enabled_templates').maybeSingle();
  const value = { ...((data?.value as Record<string, boolean>) ?? {}), [key]: enabled };
  const { error } = await supabase.from('settings').update({ value }).eq('key', 'enabled_templates');
  revalidatePath('/dashboard/settings');
  return { ok: !error };
}

export async function setRequireOptIn(enabled: boolean): Promise<{ ok: boolean }> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from('settings').update({ value: enabled }).eq('key', 'require_opt_in');
  revalidatePath('/dashboard/settings');
  return { ok: !error };
}
