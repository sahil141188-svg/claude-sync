'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { addSugarReading } from './actions';

export function ReadingForm() {
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
              await addSugarReading(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="value">Sugar (mg/dL) *</Label>
              <Input id="value" name="value" type="number" step="0.1" min={20} max={700} required inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reading_type">प्रकार</Label>
              <Select id="reading_type" name="reading_type" defaultValue="fasting">
                <option value="fasting">Fasting (सुबह खाली पेट)</option>
                <option value="pp">PP (खाने के 2 घंटे बाद)</option>
                <option value="random">Random</option>
              </Select>
            </div>
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
            <Plus className="h-6 w-6" /> {saving ? 'सेव हो रही है…' : 'Reading जोड़ें'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
