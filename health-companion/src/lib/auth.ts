import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from './types';

/**
 * Server-side auth guard for pages. Redirects to /login when there is no
 * session instead of crashing, and loads the caller's health profile.
 */
export async function requireProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  return {
    supabase,
    user,
    profile,
    isCaregiver: profile?.role === 'caregiver',
  };
}
