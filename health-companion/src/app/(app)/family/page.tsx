import { Users } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FamilyForm } from './family-form';
import { MemberRow } from './member-row';
import type { FamilyMember, UserRole } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function FamilyPage() {
  const { supabase, isCaregiver } = await requireProfile();

  const { data } = await supabase
    .from('family_members')
    .select('*')
    .order('created_at')
    .returns<FamilyMember[]>();

  const authIds = (data ?? []).map((m) => m.auth_user_id).filter(Boolean) as string[];
  const roleById = new Map<string, UserRole>();
  if (authIds.length > 0) {
    const { data: profs } = await supabase.from('profiles').select('id, role').in('id', authIds);
    for (const p of profs ?? []) roleById.set(p.id, p.role as UserRole);
  }

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
                <MemberRow
                  key={m.id}
                  member={m}
                  role={m.auth_user_id ? (roleById.get(m.auth_user_id) ?? 'family') : null}
                  canEdit={isCaregiver}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
