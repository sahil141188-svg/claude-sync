import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { TEMPLATES, isTemplateKey } from '@/lib/templates';
import type { MessageRow } from '@/lib/types';
import { ResendButton } from './resend-button';

export const dynamic = 'force-dynamic';

export default async function FailedPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from('message_log')
    .select('*')
    .eq('status', 'failed')
    .or('purpose.is.null,purpose.neq.resent')
    .order('updated_at', { ascending: false })
    .limit(200);
  const rows = (data as MessageRow[]) ?? [];

  return (
    <div>
      <h1 className="text-base font-semibold text-maroon">Failed messages</h1>
      <p className="mb-4 text-sm text-ink-60">
        Each message is retried once after 60 seconds. These failed both times. Fix the cause, then resend.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-20 px-4 py-10 text-center text-ink-60">
          No failed messages.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-xl border border-ink-10 border-l-4 border-l-red p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {isTemplateKey(m.template_key) ? TEMPLATES[m.template_key].label : m.template_key}
                    {m.order_no && (
                      <>
                        {' · '}
                        <Link
                          href={`/dashboard/timeline?q=${encodeURIComponent(m.order_no)}`}
                          className="underline decoration-ink-20 underline-offset-4 hover:text-maroon"
                        >
                          #{m.order_no}
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="text-sm text-ink-60">
                    {m.phone ?? 'no phone'} · {formatDateTime(m.updated_at)}
                  </p>
                  <p className="mt-2 rounded-lg bg-red-10 [overflow-wrap:anywhere] px-3 py-2 text-sm text-maroon">
                    {m.error ?? 'Unknown error'}
                  </p>
                </div>
                <ResendButton id={m.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
