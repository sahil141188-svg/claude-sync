'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addWeightReading } from './actions';

export function WeightForm({ lastHeight }: { lastHeight: number | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardContent className="p-5">
        <form
          ref={formRef}
          action={async (fd) => {
            setSaving(true);
            try {
              await addWeightReading(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
        >
          <div className="space-y-2">
            <Label htmlFor="weight_kg">वज़न (kg) *</Label>
            <Input id="weight_kg" name="weight_kg" type="number" step="0.1" min={20} max={250} required inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height_cm">लंबाई (cm)</Label>
            <Input
              id="height_cm"
              name="height_cm"
              type="number"
              step="0.5"
              min={100}
              max={230}
              defaultValue={lastHeight ?? ''}
              inputMode="decimal"
            />
          </div>
          <Button type="submit" size="lg" disabled={saving}>
            <Plus className="h-6 w-6" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
