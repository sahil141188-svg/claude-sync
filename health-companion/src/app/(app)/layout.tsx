import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/bottom-nav';
import { GreetingPopup } from '@/components/greeting-popup';
import type { Profile } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  const { data: settings } = await supabase
    .from('hc_app_settings')
    .select('language')
    .eq('id', 1)
    .maybeSingle();

  const lang = (settings?.language ?? 'hi') as 'hi' | 'en';

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-24">
      <GreetingPopup lang={lang} />
      <main className="flex-1 px-4 pt-4">{children}</main>
      <BottomNav role={profile?.role ?? 'caregiver'} />
    </div>
  );
}
