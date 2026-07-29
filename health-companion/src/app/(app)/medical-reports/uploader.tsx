'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ReportUploader() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFile(file: File) {
    if (!title.trim()) {
      setError('पहले report का नाम लिखें (जैसे: Blood Test July)');
      return;
    }
    setError(null);
    setDone(false);
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('medical-reports')
        .upload(path, file, { contentType: file.type });
      if (upErr) throw new Error(upErr.message);

      const { error: dbErr } = await supabase.from('medical_reports').insert({
        title: title.trim(),
        file_path: path,
        file_type: file.type,
        report_date: reportDate,
      });
      if (dbErr) throw new Error(dbErr.message);

      setTitle('');
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-elder-base font-bold">नई report upload करें</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="report-title">Report का नाम *</Label>
            <Input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="जैसे: Blood Test"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-date">तारीख़</Label>
            <Input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
        </div>
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
            <Loader2 className="h-6 w-6 animate-spin" /> Upload हो रही है…
          </p>
        )}
        {done && (
          <p className="rounded-2xl bg-success/10 p-3 text-elder-base font-semibold text-success">
            Report upload हो गई ✅
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
      </CardContent>
    </Card>
  );
}
