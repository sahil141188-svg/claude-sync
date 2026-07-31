'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { updateFamilyMember, type AddFamilyResult } from './actions';
import { DeleteFamilyButton } from './delete-button';
import type { FamilyMember } from '@/lib/types';

export function MemberRow({
  member,
  role,
  canEdit,
}: {
  member: FamilyMember;
  role: 'caregiver' | 'family' | 'patient' | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<AddFamilyResult | null>(null);
  const hasLogin = !!member.auth_user_id;

  return (
    <li className="rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-xl font-bold text-secondary">
          {member.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex-1">
          <p className="text-elder-base font-bold">{member.name}</p>
          <p className="text-sm text-muted-foreground">
            +{member.phone}
            {member.email && ` · ${member.email}`}
          </p>
        </div>
        {role === 'caregiver' ? (
          <Badge variant="warning">Admin ⭐</Badge>
        ) : hasLogin ? (
          <Badge variant="success">Login ✓</Badge>
        ) : (
          <Badge variant="muted">सिर्फ़ alerts</Badge>
        )}
        {canEdit && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${member.name} edit करें`}
              onClick={() => {
                setEditing((v) => !v);
                setResult(null);
              }}
            >
              {editing ? <X className="h-6 w-6" /> : <Pencil className="h-6 w-6 text-primary" />}
            </Button>
            <DeleteFamilyButton id={member.id} name={member.name} />
          </>
        )}
      </div>

      {editing && (
        <form
          action={async (fd) => {
            setSaving(true);
            setResult(null);
            try {
              const res = await updateFamilyMember(member.id, fd);
              setResult(res);
              if (res.ok) {
                setEditing(false);
                router.refresh();
              }
            } finally {
              setSaving(false);
            }
          }}
          className="mt-4 space-y-3 border-t border-border pt-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>नाम *</Label>
              <Input name="name" required defaultValue={member.name} />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp number *</Label>
              <Input name="phone" type="tel" required inputMode="tel" defaultValue={member.phone} />
            </div>
          </div>

          {hasLogin ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Access</Label>
                <Select name="access" defaultValue={role === 'caregiver' ? 'caregiver' : 'family'}>
                  <option value="family">View-only (सिर्फ़ देखना)</option>
                  <option value="caregiver">Admin (सब कुछ edit)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>नया password (optional)</Label>
                <Input name="new_password" type="text" minLength={6} placeholder="बदलना हो तो लिखें" />
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl bg-primary/5 p-3">
              <p className="text-base font-semibold text-primary">
                Login बनाना हो तो email + password भरें (खाली छोड़ें तो सिर्फ़ alerts):
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="member@gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input name="new_password" type="text" minLength={6} placeholder="6+ अक्षर" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access</Label>
                <Select name="access" defaultValue="family">
                  <option value="family">View-only (सिर्फ़ देखना)</option>
                  <option value="caregiver">Admin (सब कुछ edit)</option>
                </Select>
              </div>
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            <Save className="h-6 w-6" /> {saving ? 'सेव हो रहा है…' : 'बदलाव सेव करें'}
          </Button>
        </form>
      )}

      {result && (
        <p
          className={cn(
            'mt-3 rounded-2xl p-3 text-base font-semibold',
            result.ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          )}
        >
          {result.message}
        </p>
      )}
    </li>
  );
}
