import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Signed-in diagnostic: runs every step the app pages run and reports each
 * result, so a failing step can be identified from the browser without
 * server-log access. Middleware redirects anonymous visitors to /login.
 */
export async function GET() {
  const out: Record<string, unknown> = { ok: true, at: new Date().toISOString() };
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    out.user = user ? { id: user.id, email: user.email } : null;
    out.userError = userError?.message ?? null;

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      out.profile = profile ?? null;
      out.profileError = profileError?.message ?? null;

      const tables = [
        'sugar_readings',
        'bp_readings',
        'medicines',
        'medical_reports',
        'prescription_files',
        'family_members',
        'hc_app_settings',
      ];
      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        out[table] = error ? `ERROR: ${error.message}` : `ok (${count} rows visible)`;
      }
    }
  } catch (err) {
    out.ok = false;
    out.crashed = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }
  return NextResponse.json(out);
}
