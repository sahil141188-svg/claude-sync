import { DashboardTabs } from '@/components/dashboard-tabs';
import { requireAdmin } from '@/lib/auth';
import { isLive } from '@/lib/whatsapp';
import { signOut } from '../login/actions';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin();
  const { count: failedCount } = await supabase
    .from('message_log')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .or('purpose.is.null,purpose.neq.resent');

  return (
    <div className="min-h-screen">
      <header className="bg-maroon text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-base font-bold tracking-[0.2em]">ROBOTEK</p>
            <p className="text-xs text-maroon-20">Order Messages</p>
          </div>
          <div className="flex items-center gap-2">
            {!isLive() && (
              <span
                title="WA_LIVE is not true. Messages are logged, not sent."
                className="rounded-full bg-yellow px-2.5 py-1 text-xs font-semibold text-ink"
              >
                Test mode
              </span>
            )}
            <form action={signOut}>
              <button
                type="submit"
                title={user.email ?? undefined}
                className="h-10 rounded-lg px-3 text-sm font-medium text-white hover:bg-white hover:text-maroon"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <DashboardTabs failedCount={failedCount ?? 0} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
