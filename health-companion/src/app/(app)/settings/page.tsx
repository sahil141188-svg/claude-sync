import { Settings as SettingsIcon } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { SettingsForm } from './settings-form';
import { SignOutButton } from './sign-out-button';
import type { AppSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { supabase, profile } = await requireProfile();
  const { data: settings } = await supabase
    .from('hc_app_settings')
    .select('*')
    .eq('id', 1)
    .single<AppSettings>();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <SettingsIcon className="h-8 w-8 text-muted-foreground" /> Settings
      </h1>
      <p className="text-elder-base text-muted-foreground">
        {profile?.full_name} (
        {profile?.role === 'caregiver' ? 'Caregiver' : profile?.role === 'family' ? 'Family' : 'Patient'})
      </p>
      <SettingsForm
        settings={
          settings ?? {
            id: 1,
            dark_mode: false,
            notifications_enabled: true,
            whatsapp_enabled: true,
            language: 'hi',
            font_scale: 'large',
            water_goal_glasses: 8,
          }
        }
      />
      <SignOutButton />
    </div>
  );
}
