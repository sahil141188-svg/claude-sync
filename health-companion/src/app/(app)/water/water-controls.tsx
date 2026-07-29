'use client';

import { useTransition } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { adjustWater } from './actions';

export function WaterControls() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-center gap-4">
      <Button
        variant="outline"
        size="icon"
        className="h-16 w-16 rounded-full"
        disabled={pending}
        onClick={() => startTransition(() => adjustWater(-1))}
        aria-label="एक गिलास घटाएँ"
      >
        <Minus className="h-8 w-8" />
      </Button>
      <Button
        size="lg"
        className="h-16 flex-1 rounded-full bg-sky-500 text-white"
        disabled={pending}
        onClick={() => startTransition(() => adjustWater(1))}
      >
        <Plus className="h-8 w-8" /> 1 गिलास पिया
      </Button>
    </div>
  );
}
