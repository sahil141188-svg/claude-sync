'use client';

import { useTransition } from 'react';
import { Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { archiveMedicine } from './actions';

export function ArchiveMedicineButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (confirm('इस दवा को archive करें? (लिस्ट से हट जाएगी, history बनी रहेगी)')) {
          startTransition(() => archiveMedicine(id));
        }
      }}
    >
      <Archive className="h-5 w-5" /> Archive
    </Button>
  );
}
