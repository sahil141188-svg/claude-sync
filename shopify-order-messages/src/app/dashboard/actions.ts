'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { resendMessage, sendTestMessage } from '@/lib/messages';
import { normalizePhone } from '@/lib/phone';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTemplateKey } from '@/lib/templates';
import { activeProviderName, isLive } from '@/lib/whatsapp';

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

export async function sendTest(rawPhone: string, key: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, message: 'Enter a valid mobile number, e.g. 98765 43210.' };
  if (!isTemplateKey(key)) return { ok: false, message: 'Pick a message.' };

  const result = await sendTestMessage(createAdminClient(), phone, key);
  revalidatePath('/dashboard', 'layout');
  const via = activeProviderName() === 'maytapi' ? 'Maytapi' : 'WhatsApp Cloud API';
  switch (result.outcome) {
    case 'sent':
      return isLive()
        ? { ok: true, message: `Sent to ${phone} via ${via}. It should arrive within a few seconds.` }
        : { ok: true, message: `Test mode: logged for ${phone} but not sent. Set WA_LIVE=true in Vercel and redeploy to really send.` };
    case 'retry':
      return { ok: false, message: `Failed, will retry in 60 seconds: ${result.detail}` };
    default:
      return { ok: false, message: `Not sent: ${result.detail ?? result.outcome}` };
  }
}
