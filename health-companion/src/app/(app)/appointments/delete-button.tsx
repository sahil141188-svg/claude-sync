'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteAppointment } from './actions';

export function DeleteAppointmentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Appointment हटाएँ"
      disabled={pending}
      onClick={() => {
        if (confirm('यह appointment हटाएँ?')) {
          startTransition(() => deleteAppointment(id));
        }
      }}
    >
      <Trash2 className="h-6 w-6 text-destructive" />
    </Button>
  );
}
