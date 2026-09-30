import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, serviceRoleKey } from './env';

/**
 * Service-role client for webhooks, cron jobs and server actions.
 * Bypasses RLS. Never import this from a client component.
 */
export function createAdminClient() {
  const url = SUPABASE_URL;
  const key = serviceRoleKey();
  if (!url || !key) throw new Error('Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
