'use client';

import { useState, useTransition } from 'react';
import { ExternalLink, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { deleteMedicalReport } from './actions';
import type { MedicalReport } from '@/lib/types';

export function ReportRow({ report, canDelete }: { report: MedicalReport; canDelete: boolean }) {
  const [opening, setOpening] = useState(false);
  const [pending, startTransition] = useTransition();
  const isPdf = report.file_type === 'application/pdf';

  async function openReport() {
    setOpening(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from('medical-reports')
        .createSignedUrl(report.file_path, 3600);
      if (error || !data) throw new Error(error?.message ?? 'Could not open');
      window.open(data.signedUrl, '_blank');
    } catch {
      alert('Report नहीं खुल पाई — दोबारा कोशिश करें।');
    } finally {
      setOpening(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border p-3">
      <button
        onClick={openReport}
        disabled={opening}
        className="flex flex-1 items-center gap-3 text-left"
      >
        {isPdf ? (
          <FileText className="h-8 w-8 shrink-0 text-rose-500" />
        ) : (
          <ImageIcon className="h-8 w-8 shrink-0 text-primary" />
        )}
        <span className="flex-1">
          <span className="block text-elder-base font-bold">{report.title}</span>
          <span className="block text-sm text-muted-foreground">
            {new Date(report.report_date + 'T00:00:00').toLocaleDateString('hi-IN', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </span>
        <ExternalLink className="h-5 w-5 text-muted-foreground" />
      </button>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Report हटाएँ"
          disabled={pending}
          onClick={() => {
            if (confirm(`"${report.title}" हटाएँ?`)) {
              startTransition(() => deleteMedicalReport(report.id, report.file_path));
            }
          }}
        >
          <Trash2 className="h-6 w-6 text-destructive" />
        </Button>
      )}
    </li>
  );
}
