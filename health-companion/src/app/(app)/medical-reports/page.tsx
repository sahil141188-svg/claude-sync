import { FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportUploader } from './uploader';
import { ReportRow } from './report-row';
import type { MedicalReport, Profile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MedicalReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<Pick<Profile, 'role'>>();
  const isCaregiver = profile?.role === 'caregiver';

  const { data } = await supabase
    .from('medical_reports')
    .select('*')
    .order('report_date', { ascending: false })
    .returns<MedicalReport[]>();

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <FolderOpen className="h-8 w-8 text-violet-500" /> Medical Reports
      </h1>
      <p className="text-elder-base text-muted-foreground">
        Lab reports, X-ray, scan — सब एक जगह। नाम पर दबाकर खोलें।
      </p>

      {isCaregiver && <ReportUploader />}

      <Card>
        <CardHeader>
          <CardTitle>सभी reports ({(data ?? []).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {(data ?? []).length === 0 ? (
            <p className="text-elder-base text-muted-foreground">
              अभी कोई report upload नहीं हुई है।
            </p>
          ) : (
            <ul className="space-y-3">
              {(data ?? []).map((r) => (
                <ReportRow key={r.id} report={r} canDelete={isCaregiver} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
