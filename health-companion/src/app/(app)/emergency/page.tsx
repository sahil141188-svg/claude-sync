import { Hospital, Phone, Siren, Stethoscope, UserRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { AddContactForm } from './add-contact-form';
import type { EmergencyContact, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

const KIND_ICON: Record<string, React.ReactNode> = {
  doctor: <Stethoscope className="h-8 w-8" />,
  hospital: <Hospital className="h-8 w-8" />,
  caregiver: <UserRound className="h-8 w-8" />,
  other: <Phone className="h-8 w-8" />,
};

export default async function EmergencyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<Pick<Profile, 'role'>>();

  const { data: contacts } = await supabase
    .from('emergency_contacts')
    .select('*')
    .order('sort_order')
    .returns<EmergencyContact[]>();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold text-destructive">
        <Siren className="h-8 w-8" /> Emergency
      </h1>
      <p className="text-elder-base text-muted-foreground">
        नीचे किसी भी नाम पर दबाते ही call लग जाएगी।
      </p>

      {(contacts ?? []).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-elder-base text-muted-foreground">
            अभी कोई emergency contact नहीं जोड़ा गया है।
          </CardContent>
        </Card>
      )}

      {(contacts ?? []).map((c) => (
        <a key={c.id} href={`tel:${c.phone}`} className="block">
          <Card className="border-2 border-destructive/30 transition-transform active:scale-[0.97]">
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                {KIND_ICON[c.kind] ?? KIND_ICON.other}
              </span>
              <div className="flex-1">
                <p className="text-elder-lg font-bold">{c.name}</p>
                <p className="text-base text-muted-foreground">
                  {c.label} · {c.phone}
                </p>
              </div>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-white shadow-lg">
                <Phone className="h-7 w-7" />
              </span>
            </CardContent>
          </Card>
        </a>
      ))}

      {profile?.role === 'caregiver' && <AddContactForm />}
    </div>
  );
}
