'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addAppointment } from './actions';

export function AppointmentForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-3 text-elder-base font-bold">नई appointment जोड़ें</p>
        <form
          ref={formRef}
          action={async (fd) => {
            setSaving(true);
            try {
              await addAppointment(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="doctor_name">डॉक्टर का नाम *</Label>
            <Input id="doctor_name" name="doctor_name" required placeholder="जैसे: Dr. Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="visit_date">तारीख़ *</Label>
              <Input
                id="visit_date"
                name="visit_date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visit_time">समय</Label>
              <Input id="visit_time" name="visit_time" type="time" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="जैसे: fasting reports साथ ले जाएँ" />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Plus className="h-6 w-6" /> {saving ? 'सेव हो रही है…' : 'Appointment जोड़ें'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
