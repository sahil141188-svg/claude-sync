'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { addFamilyMember, type AddFamilyResult } from './actions';

export function FamilyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [withLogin, setWithLogin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AddFamilyResult | null>(null);

  return (
    <Card>
      <CardContent className="p-5">
        <p className="mb-3 text-elder-base font-bold">नया family member जोड़ें</p>
        <form
          ref={formRef}
          action={async (fd) => {
            setSaving(true);
            setResult(null);
            try {
              const res = await addFamilyMember(fd);
              setResult(res);
              if (res.ok) {
                formRef.current?.reset();
                setWithLogin(false);
                router.refresh();
              }
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fm-name">नाम *</Label>
              <Input id="fm-name" name="name" required placeholder="जैसे: Rahul" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fm-phone">WhatsApp number *</Label>
              <Input
                id="fm-phone"
                name="phone"
                type="tel"
                required
                inputMode="tel"
                placeholder="91XXXXXXXXXX"
              />
            </div>
          </div>

          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-elder-base font-semibold',
              withLogin ? 'border-primary bg-primary/10 text-primary' : 'border-border'
            )}
          >
            <input
              type="checkbox"
              checked={withLogin}
              onChange={(e) => setWithLogin(e.target.checked)}
              className="h-5 w-5 accent-current"
            />
            App का login भी बनाएँ (view-only)
          </label>

          {withLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fm-email">Email *</Label>
                <Input id="fm-email" name="email" type="email" required placeholder="rahul@gmail.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fm-password">Password *</Label>
                <Input
                  id="fm-password"
                  name="password"
                  type="text"
                  required
                  minLength={6}
                  placeholder="कम से कम 6 अक्षर"
                />
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <UserPlus className="h-6 w-6" /> {saving ? 'जुड़ रहे हैं…' : 'Member जोड़ें'}
          </Button>

          {result && (
            <p
              className={cn(
                'rounded-2xl p-3 text-elder-base font-semibold',
                result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
              )}
            >
              {result.message}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
