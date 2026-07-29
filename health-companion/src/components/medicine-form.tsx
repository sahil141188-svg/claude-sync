'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Medicine } from '@/lib/types';

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777'];

export function MedicineForm({
  medicine,
  action,
  submitLabel,
}: {
  medicine?: Medicine;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
}) {
  const [slots, setSlots] = useState<Record<string, boolean>>({
    morning: medicine?.slots.includes('morning') ?? false,
    afternoon: medicine?.slots.includes('afternoon') ?? false,
    night: medicine?.slots.includes('night') ?? false,
    custom: medicine?.slots.includes('custom') ?? false,
  });
  const [color, setColor] = useState(medicine?.color_tag ?? COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={async (fd) => {
        setSubmitting(true);
        try {
          await action(fd);
        } finally {
          setSubmitting(false);
        }
      }}
      className="space-y-4"
    >
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="name">दवा का नाम *</Label>
            <Input id="name" name="name" required defaultValue={medicine?.name} placeholder="जैसे: Metformin 500mg" />
          </div>

          <div className="space-y-2">
            <Label>समय (कम से कम एक चुनें) *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['morning', 'सुबह (8:00 AM)'],
                  ['afternoon', 'दोपहर (1:30 PM)'],
                  ['night', 'रात (9:00 PM)'],
                  ['custom', 'Custom समय'],
                ] as const
              ).map(([slot, label]) => (
                <label
                  key={slot}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-2xl border-2 p-3 text-elder-base font-semibold transition-colors',
                    slots[slot] ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                  )}
                >
                  <input
                    type="checkbox"
                    name={`slot_${slot}`}
                    checked={slots[slot]}
                    onChange={(e) => setSlots((s) => ({ ...s, [slot]: e.target.checked }))}
                    className="h-5 w-5 accent-current"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {slots.custom && (
            <div className="space-y-2">
              <Label htmlFor="custom_time">Custom समय</Label>
              <Input
                id="custom_time"
                name="custom_time"
                type="time"
                defaultValue={medicine?.custom_time?.slice(0, 5) ?? '17:00'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="food_relation">खाने के साथ</Label>
              <Select id="food_relation" name="food_relation" defaultValue={medicine?.food_relation ?? 'any'}>
                <option value="before_food">खाने से पहले</option>
                <option value="after_food">खाने के बाद</option>
                <option value="any">कभी भी</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">मात्रा</Label>
              <Input id="quantity" name="quantity" defaultValue={medicine?.quantity ?? '1 tablet'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date">शुरुआत</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={medicine?.start_date ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">अंत (optional)</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={medicine?.end_date ?? ''} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="doctor_name">डॉक्टर का नाम</Label>
              <Input id="doctor_name" name="doctor_name" defaultValue={medicine?.doctor_name ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_count">Stock (गोलियाँ)</Label>
              <Input
                id="stock_count"
                name="stock_count"
                type="number"
                min={0}
                defaultValue={medicine?.stock_count ?? ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry date (optional)</Label>
            <Input id="expiry_date" name="expiry_date" type="date" defaultValue={medicine?.expiry_date ?? ''} />
          </div>

          <div className="space-y-2">
            <Label>Color tag</Label>
            <input type="hidden" name="color_tag" value={color} />
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-10 w-10 rounded-full border-4 transition-transform',
                    color === c ? 'scale-110 border-foreground' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={medicine?.notes ?? ''} placeholder="जैसे: दूध के साथ न लें" />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? 'सेव हो रहा है…' : submitLabel}
      </Button>
    </form>
  );
}
