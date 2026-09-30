/**
 * Supabase settings, cleaned of the stray spaces, line breaks and quotes that
 * sneak in when values are pasted into a hosting dashboard. URLs and keys never
 * contain whitespace, so removing it is always safe.
 */
function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');
}

// Referenced as literal process.env.NEXT_PUBLIC_* so Next.js can inline them.
export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function serviceRoleKey(): string {
  return clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Human-readable problems with the public Supabase settings, or [] when they look right.
 * Never includes the values themselves.
 */
export function configProblems(): string[] {
  const problems: string[] = [];
  const hidden = (v: string) => /[^\x21-\x7e]/.test(v);

  if (!SUPABASE_URL) problems.push('NEXT_PUBLIC_SUPABASE_URL is empty.');
  else if (hidden(SUPABASE_URL)) problems.push('NEXT_PUBLIC_SUPABASE_URL contains hidden characters (such as • from a masked value). Paste it again.');
  else if (!/^https:\/\/[^/\s]+$/.test(SUPABASE_URL)) problems.push('NEXT_PUBLIC_SUPABASE_URL should look like https://xxxx.supabase.co');

  if (!SUPABASE_ANON_KEY) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is empty.');
  else if (hidden(SUPABASE_ANON_KEY)) problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY contains hidden characters (such as • from a masked value). Paste the full key again.');
  else if (!(SUPABASE_ANON_KEY.startsWith('sb_publishable_') || SUPABASE_ANON_KEY.split('.').length === 3))
    problems.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not look like a Supabase anon or publishable key.');

  return problems;
}
