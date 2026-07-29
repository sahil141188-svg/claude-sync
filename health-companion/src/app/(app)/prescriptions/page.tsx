import { FileText } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PrescriptionUploader } from './uploader';
import type { ExtractedMedicine, PrescriptionFile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PrescriptionsPage() {
  const { supabase, isCaregiver } = await requireProfile();

  const [{ data: prescriptions }, { data: extracted }] = await Promise.all([
    supabase
      .from('prescription_files')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<PrescriptionFile[]>(),
    supabase.from('extracted_medicines').select('*').returns<ExtractedMedicine[]>(),
  ]);

  const extractedByPrescription = new Map<string, ExtractedMedicine[]>();
  for (const e of extracted ?? []) {
    const list = extractedByPrescription.get(e.prescription_id) ?? [];
    list.push(e);
    extractedByPrescription.set(e.prescription_id, list);
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="flex items-center gap-2 text-elder-xl font-bold">
        <FileText className="h-8 w-8 text-primary" /> Prescriptions
      </h1>

      {isCaregiver && <PrescriptionUploader />}

      {(prescriptions ?? []).map((p) => {
        const meds = extractedByPrescription.get(p.id) ?? [];
        return (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-elder-base">
                {p.doctor_name ? `Dr. ${p.doctor_name}` : 'Prescription'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                {' · '}
                {p.ocr_done ? (
                  <Badge variant="success">पढ़ी गई ({meds.length} दवाइयाँ)</Badge>
                ) : (
                  <Badge variant="muted">OCR pending</Badge>
                )}
              </p>
            </CardHeader>
            {meds.length > 0 && (
              <CardContent>
                <ul className="space-y-1">
                  {meds.map((m) => (
                    <li key={m.id} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2 text-base">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-muted-foreground">
                        {[m.morning && 'सुबह', m.afternoon && 'दोपहर', m.night && 'रात']
                          .filter(Boolean)
                          .join(' + ') || '—'}
                        {m.applied && ' ✅'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        );
      })}

      {(prescriptions ?? []).length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-elder-base text-muted-foreground">
            अभी कोई prescription upload नहीं हुई है।
          </CardContent>
        </Card>
      )}
    </div>
  );
}
