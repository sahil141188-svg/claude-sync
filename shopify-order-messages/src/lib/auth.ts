import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

/** Signed-in user who is listed in dashboard_admins. Redirects otherwise. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data } = await supabase.from('dashboard_admins').select('email').maybeSingle();
  if (!data) redirect('/login?error=not_admin');
  return { supabase, user };
}
