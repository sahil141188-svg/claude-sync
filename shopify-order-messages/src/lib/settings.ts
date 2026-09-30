import type { SupabaseClient } from '@supabase/supabase-js';
import { TEMPLATE_KEYS, type TemplateKey } from './templates';

export interface AppSettings {
  requireOptIn: boolean;
  enabledTemplates: Record<TemplateKey, boolean>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  requireOptIn: true,
  enabledTemplates: Object.fromEntries(TEMPLATE_KEYS.map((k) => [k, true])) as Record<TemplateKey, boolean>,
};

export async function loadSettings(db: SupabaseClient): Promise<AppSettings> {
  const { data, error } = await db.from('settings').select('key, value');
  if (error || !data) return DEFAULT_SETTINGS;
  const map = new Map(data.map((r) => [r.key as string, r.value]));
  const enabled = (map.get('enabled_templates') ?? {}) as Partial<Record<TemplateKey, boolean>>;
  return {
    requireOptIn: map.has('require_opt_in') ? map.get('require_opt_in') === true : DEFAULT_SETTINGS.requireOptIn,
    enabledTemplates: Object.fromEntries(
      TEMPLATE_KEYS.map((k) => [k, enabled[k] !== false])
    ) as Record<TemplateKey, boolean>,
  };
}
