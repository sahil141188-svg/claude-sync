import { requireAdmin } from '@/lib/auth';
import { loadSettings } from '@/lib/settings';
import { TEMPLATE_KEYS, TEMPLATES } from '@/lib/templates';
import { activeProviderName, isLive } from '@/lib/whatsapp';
import { setRequireOptIn, setTemplateEnabled } from '../actions';
import { Toggle } from './toggle';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const settings = await loadSettings(supabase);

  const checks = [
    { label: 'Live sending (WA_LIVE)', ok: isLive(), off: 'Test mode: messages are logged, not sent' },
    activeProviderName() === 'maytapi'
      ? {
          label: 'WhatsApp sender: Maytapi',
          ok: !!(process.env.MAYTAPI_PRODUCT_ID && process.env.MAYTAPI_PHONE_ID && process.env.MAYTAPI_API_TOKEN),
          off: 'Maytapi product ID, phone ID or token not set',
        }
      : {
          label: 'WhatsApp sender: Meta Cloud API',
          ok: !!(process.env.WA_PHONE_NUMBER_ID && process.env.WA_ACCESS_TOKEN),
          off: 'Not set',
        },
    { label: 'Shopify webhook secret', ok: !!process.env.SHOPIFY_WEBHOOK_SECRET, off: 'Not set' },
    { label: 'Shopify Admin API (COD tagging)', ok: !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN, off: 'Not set, COD orders will not be tagged' },
    { label: 'Cron secret', ok: !!process.env.CRON_SECRET, off: 'Not set, scheduled messages will not go out' },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-base font-semibold text-maroon">Consent</h1>
        <p className="mb-3 text-sm text-ink-60">Review requests are marketing and always need an opt-in, whatever this is set to.</p>
        <div className="rounded-xl border border-ink-10">
          <Toggle
            label="Require opt-in"
            description="Only message customers who opted in at checkout or by replying on WhatsApp."
            initial={settings.requireOptIn}
            onSave={setRequireOptIn.bind(null)}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold text-maroon">Message types</h2>
        <p className="mb-3 text-sm text-ink-60">Switched-off messages are logged as skipped and never sent.</p>
        <div className="divide-y divide-ink-10 rounded-xl border border-ink-10">
          {TEMPLATE_KEYS.map((key) => (
            <Toggle
              key={key}
              label={TEMPLATES[key].label}
              description={TEMPLATES[key].trigger}
              initial={settings.enabledTemplates[key]}
              onSave={setTemplateEnabled.bind(null, key)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-maroon">Connection status</h2>
        <ul className="divide-y divide-ink-10 rounded-xl border border-ink-10">
          {checks.map((c) => (
            <li key={c.label} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
              <span className="font-medium">{c.label}</span>
              {c.ok ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full bg-red" aria-hidden />
                  Ready
                </span>
              ) : (
                <span className="rounded-full bg-yellow px-2.5 py-1 text-right text-xs font-semibold text-ink">{c.off}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
