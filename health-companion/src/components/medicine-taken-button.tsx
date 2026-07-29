'use client';

import { useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Big "✅ Taken" button — turns green and stores the timestamp. */
export function MedicineTakenButton({ logId, taken }: { logId: string; taken: boolean }) {
  const router = useRouter();
  const [isTaken, setIsTaken] = useState(taken);
  const [pending, startTransition] = useTransition();

  async function markTaken() {
    if (isTaken) return;
    setIsTaken(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('medicine_logs')
      .update({ taken: true, taken_at: new Date().toISOString() })
      .eq('id', logId);
    if (error) {
      setIsTaken(false);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <Button
      onClick={markTaken}
      disabled={pending || isTaken}
      variant={isTaken ? 'success' : 'outline'}
      size="lg"
      className={cn('min-w-32 shrink-0', isTaken && 'disabled:opacity-100')}
    >
      <Check className="h-6 w-6" />
      {isTaken ? 'ली गई' : 'Taken'}
    </Button>
  );
}
