import { Users } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FamilyForm } from './family-form';
import { DeleteFamilyButton } from './delete-button';
import type { FamilyMember } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const { supabase, isCaregiver } = await requireProfile();

  const { data } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at')
    .returns<FamilyMember[]>();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <Users className="h-8 w-8 text-secondary" /> Family Members
      </h1>
      <p className="text-elder-base text-muted-foreground">
        दवा छूटने का alert और daily health report सभी family members को WhatsApp पर जाएगा।
      </p>

      {isCaregiver && <FamilyForm />}

      <Card>
        <CardHeader>
          <CardTitle>परिवार ({(data ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {(data ?? []).length === 0 ? (
            <p className="text-elder-base text-muted-foreground">
              अभी कोई family member नहीं जुड़ा है।
            </p>
          ) : (
            <ul className="space-y-3">
              {(data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xl font-bold text-secondary">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="text-elder-base font-bold">{m.name}</p>
                    <p className="text-sm text-muted-foreground">
                      +{m.phone}
                      {m.email && ` · ${m.email}`}
                    </p>
                  </div>
                  {m.auth_user_id ? (
                    <Badge variant="success">Login ✓</Badge>
                  ) : (
                    <Badge variant="muted">सिर्फ़ alerts</Badge>
                  )}
                  {isCaregiver && <DeleteFamilyButton id={m.id} name={m.name} />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
