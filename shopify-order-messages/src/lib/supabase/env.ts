/**
 * Supabase settings, cleaned of the stray spaces, line breaks and quotes that
 * sneak in when values are pasted into a hosting dashboard. URLs and keys never
 * contain whitespace, so removing it is always safe.
 */
function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');
}

/**
 * Robotek's Supabase project. Both values are public by design (they ship to every browser
 * that opens the ERP or this dashboard), so they are safe to keep in code. They are used only
 * when the Vercel setting is missing or was pasted with masked characters (•). The secret
 * service role key is never stored here.
 */
const DEFAULT_SUPABASE_URL = 'https://mnxyqvtqegywxybeobzk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueHlxdnRxZWd5d3h5YmVvYnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODM5MDAsImV4cCI6MjA5Nzg1OTkwMH0.Pml7znEsMDGhpCsMNsYCwoDCLNXbmZk1Y2HSpR-inqU';

const hasHidden = (v: string) => /[^\x21-\x7e]/.test(v);
const urlOk = (v: string) => !!v && !hasHidden(v) && /^https:\/\/[^/\s]+$/.test(v);
const keyOk = (v: string) =>
  !!v && !hasHidden(v) && (v.startsWith('sb_publishable_') || v.split('.').length === 3);

// Referenced as literal process.env.NEXT_PUBLIC_* so Next.js can inline them.
const rawUrl = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, '');
const rawKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const SUPABASE_URL = urlOk(rawUrl) ? rawUrl : DEFAULT_SUPABASE_URL;
// A key belongs to one project, so only fall back to the default key with the default URL.
export const SUPABASE_ANON_KEY = keyOk(rawKey)
  ? rawKey
  : SUPABASE_URL === DEFAULT_SUPABASE_URL
    ? DEFAULT_SUPABASE_ANON_KEY
    : rawKey;

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
