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
