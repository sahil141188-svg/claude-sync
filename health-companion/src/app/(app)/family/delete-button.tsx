'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteFamilyMember } from './actions';

export function DeleteFamilyButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Member हटाएँ"
      disabled={pending}
      onClick={() => {
        if (confirm(`${name} को हटाएँ? (इनका login भी हट जाएगा)`)) {
          startTransition(() => deleteFamilyMember(id));
        }
      }}
    >
      <Trash2 className="h-6 w-6 text-destructive" />
    </Button>
  );
}
