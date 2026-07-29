'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { applyExtractedMedicines } from './actions';
import type { ExtractedPrescription } from '@/lib/ai';

type Phase = 'idle' | 'uploading' | 'extracting' | 'review' | 'applying';

export function PrescriptionUploader() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractedPrescription | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setPhase('uploading');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('prescriptions')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { data: row, error: dbErr } = await supabase
        .from('prescription_files')
        .insert({ file_path: path, file_type: file.type })
        .select('id')
        .single();
      if (dbErr) throw new Error(dbErr.message);

      setPhase('extracting');
      const res = await fetch('/api/prescriptions/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prescriptionId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Extraction failed');

      setPrescriptionId(row.id);
      setResult(json.extracted);
      setPhase('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
    }
  }

  async function apply(replace: boolean) {
    if (!prescriptionId) return;
    setPhase('applying');
    try {
      await applyExtractedMedicines(prescriptionId, replace);
      setPhase('idle');
      setResult(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('review');
    }
  }

  const busy = phase === 'uploading' || phase === 'extracting' || phase === 'applying';

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-elder-base font-bold">नई prescription जोड़ें</p>
        <p className="text-base text-muted-foreground">
          Photo/PDF upload करें — AI अपने आप दवाइयाँ पढ़ लेगा।
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" disabled={busy} onClick={() => cameraInput.current?.click()}>
            <Camera className="h-6 w-6" /> Camera
          </Button>
          <Button size="lg" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
            <Upload className="h-6 w-6" /> File/PDF
          </Button>
        </div>
        {busy && (
          <p className="flex items-center gap-2 rounded-2xl bg-primary/10 p-3 text-elder-base text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            {phase === 'uploading' && 'Upload हो रही है…'}
            {phase === 'extracting' && 'AI prescription पढ़ रहा है…'}
            {phase === 'applying' && 'दवाइयाँ बन रही हैं…'}
          </p>
        )}
        {error && (
          <p className="rounded-2xl bg-destructive/10 p-3 text-base text-destructive">{error}</p>
        )}

        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        <Dialog open={phase === 'review' && !!result} onClose={() => setPhase('idle')}>
          <h2 className="text-elder-lg font-bold">मिली हुई दवाइयाँ</h2>
          {result?.doctor_name && (
            <p className="mt-1 text-base text-muted-foreground">Dr. {result.doctor_name}</p>
          )}
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {result?.medicines.length === 0 && (
              <p className="text-base text-muted-foreground">कोई दवा नहीं पढ़ी जा सकी।</p>
            )}
            {result?.medicines.map((m, i) => (
              <li key={i} className="rounded-2xl bg-muted p-3">
                <p className="text-elder-base font-bold">{m.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[m.morning && 'सुबह', m.afternoon && 'दोपहर', m.night && 'रात']
                    .filter(Boolean)
                    .join(' + ') || 'समय नहीं मिला'}
                  {m.dose && ` · ${m.dose}`}
                  {m.duration_days && ` · ${m.duration_days} दिन`}
                </p>
              </li>
            ))}
          </ul>
          {(result?.medicines.length ?? 0) > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-elder-base font-semibold">
                क्या पुरानी दवाइयाँ हटाकर ये नई दवाइयाँ लगा दें?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="destructive" size="lg" onClick={() => apply(true)}>
                  हाँ, बदल दें
                </Button>
                <Button variant="outline" size="lg" onClick={() => apply(false)}>
                  नहीं, साथ में जोड़ें
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </CardContent>
    </Card>
  );
}
