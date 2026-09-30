import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/cron-auth';
import { dispatchDue } from '@/lib/messages';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Sends every queued message whose time has come. This single job covers:
 * - order_processing, 2 hours after confirmation
 * - cod_confirmation reminder, 4 hours after a COD order with no reply
 * - review_request, 3 days after delivery
 * - the one retry, 60 seconds after a failed send
 * Schedule it every minute (see vercel.json and README).
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const results = await dispatchDue(createAdminClient());
    const summary = results.reduce<Record<string, number>>((acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
      return acc;
    }, {});
    return NextResponse.json({ ok: true, processed: results.length, summary });
  } catch (err) {
    console.error('[cron:dispatch]', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
