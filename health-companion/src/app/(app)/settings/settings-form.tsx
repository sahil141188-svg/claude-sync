'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Languages, MessageCircle, Moon, Type } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { updateSettings } from './actions';
import type { AppSettings } from '@/lib/types';

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const router = useRouter();
  const [state, setState] = useState(settings);
  const [, startTransition] = useTransition();

  function save(patch: Partial<Omit<AppSettings, 'id'>>) {
    setState((s) => ({ ...s, ...patch }));
    startTransition(async () => {
      await updateSettings(patch);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        <Row icon={<Moon className="h-7 w-7 text-indigo-500" />} label="Dark Mode">
          <Switch
            checked={state.dark_mode}
            onCheckedChange={(v) => save({ dark_mode: v })}
            aria-label="Dark mode"
          />
        </Row>
        <Row icon={<Bell className="h-7 w-7 text-amber-500" />} label="Notifications">
          <Switch
            checked={state.notifications_enabled}
            onCheckedChange={(v) => save({ notifications_enabled: v })}
            aria-label="Notifications"
          />
        </Row>
        <Row icon={<MessageCircle className="h-7 w-7 text-success" />} label="WhatsApp Reminders">
          <Switch
            checked={state.whatsapp_enabled}
            onCheckedChange={(v) => save({ whatsapp_enabled: v })}
            aria-label="WhatsApp"
          />
        </Row>
        <Row icon={<Languages className="h-7 w-7 text-primary" />} label="भाषा / Language">
          <Select
            value={state.language}
            onChange={(e) => save({ language: e.target.value as 'hi' | 'en' })}
            className="w-36"
            aria-label="Language"
          >
            <option value="hi">हिंदी</option>
            <option value="en">English</option>
          </Select>
        </Row>
        <Row icon={<Type className="h-7 w-7 text-violet-500" />} label="Font Size">
          <Select
            value={state.font_scale}
            onChange={(e) => save({ font_scale: e.target.value as AppSettings['font_scale'] })}
            className="w-36"
            aria-label="Font size"
          >
            <option value="normal">Normal</option>
            <option value="large">Large</option>
            <option value="xl">Extra Large</option>
          </Select>
        </Row>
        <Row icon={<span className="text-2xl">💧</span>} label="पानी का लक्ष्य (गिलास)">
          <Select
            value={String(state.water_goal_glasses)}
            onChange={(e) => save({ water_goal_glasses: Number(e.target.value) })}
            className="w-36"
            aria-label="Water goal"
          >
            {[6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Row>
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        {icon}
        <p className="text-elder-base font-semibold">{label}</p>
      </div>
      {children}
    </div>
  );
}
