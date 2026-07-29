'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { addEmergencyContact } from './actions';

export function AddContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-3 text-elder-base font-bold">नया contact जोड़ें</p>
        <form
          ref={formRef}
          action={async (fd) => {
            setSaving(true);
            try {
              await addEmergencyContact(fd);
              formRef.current?.reset();
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">नाम *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" name="phone" type="tel" required inputMode="tel" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="kind">प्रकार</Label>
              <Select id="kind" name="kind" defaultValue="doctor">
                <option value="doctor">Doctor</option>
                <option value="hospital">Hospital</option>
                <option value="caregiver">Caregiver</option>
                <option value="other">अन्य</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input id="label" name="label" placeholder="जैसे: Family Doctor" />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Plus className="h-6 w-6" /> जोड़ें
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
