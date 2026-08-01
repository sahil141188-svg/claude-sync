'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { addBpReading } from './actions';

export function BpForm() {
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
              await addBpReading(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="systolic">Systolic *</Label>
              <Input id="systolic" name="systolic" type="number" min={60} max={260} required inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diastolic">Diastolic *</Label>
              <Input id="diastolic" name="diastolic" type="number" min={40} max={160} required inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pulse">Pulse</Label>
              <Input id="pulse" name="pulse" type="number" min={30} max={220} inputMode="numeric" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="day_period">कब की reading?</Label>
            <Select
              id="day_period"
              name="day_period"
              defaultValue={new Date().getHours() < 15 ? 'morning' : 'evening'}
            >
              <option value="morning">🌅 सुबह (Morning)</option>
              <option value="evening">🌆 शाम (Evening)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="measured_at">समय</Label>
              <Input id="measured_at" name="measured_at" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="optional" />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Plus className="h-6 w-6" /> {saving ? 'सेव हो रही है…' : 'BP जोड़ें'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
