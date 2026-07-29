'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { addExerciseLog } from './actions';

export function ExerciseForm() {
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
              await addExerciseLog(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"
        >
          <div className="space-y-2">
            <Label htmlFor="exercise_type">Activity</Label>
            <Select id="exercise_type" name="exercise_type" defaultValue="walking">
              <option value="walking">सैर (Walking)</option>
              <option value="yoga">योग (Yoga)</option>
              <option value="cycling">साइकिल (Cycling)</option>
              <option value="meditation">ध्यान (Meditation)</option>
              <option value="other">अन्य</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration_min">मिनट *</Label>
            <Input id="duration_min" name="duration_min" type="number" min={1} max={300} required inputMode="numeric" />
          </div>
          <Button type="submit" size="lg" disabled={saving}>
            <Plus className="h-6 w-6" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
