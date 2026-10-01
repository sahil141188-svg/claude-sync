import { requireAdmin } from '@/lib/auth';
import { TEMPLATE_KEYS, TEMPLATES, renderTemplate, sampleVars } from '@/lib/templates';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-base font-semibold text-maroon">Templates</h1>
      <p className="mb-4 text-sm text-ink-60">
        Read-only preview with sample values. Wording is managed in Meta Business Manager and src/lib/templates.ts.
      </p>
      <ul className="grid gap-4 md:grid-cols-2">
        {TEMPLATE_KEYS.map((key) => {
          const t = TEMPLATES[key];
          return (
            <li key={key} className="flex flex-col rounded-xl border border-ink-10 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{t.label}</h2>
                  <p className="font-mono text-xs text-ink-60">{key}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    t.category === 'marketing' ? 'bg-yellow text-ink' : 'bg-ink-5 text-ink-80'
                  }`}
                >
                  {t.category === 'marketing' ? 'Marketing' : 'Utility'}
                </span>
              </div>
              <p className="mt-3 rounded-lg rounded-tl-none border border-ink-10 bg-ink-5 px-3 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-line">
                {renderTemplate(key, sampleVars(key))}
              </p>
              <p className="mt-3 text-xs text-ink-60">
                <span className="font-semibold text-ink-80">When: </span>
                {t.trigger}
              </p>
              <details className="mt-2 text-xs text-ink-60">
                <summary className="cursor-pointer py-1 hover:text-maroon">Variables</summary>
                <ol className="mt-1 space-y-0.5 [overflow-wrap:anywhere]">
                  {t.variables.map((v, i) => (
                    <li key={v.name}>
                      <span className="font-mono">{`{{${i + 1}}}`}</span> {v.name}: {v.sample}
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
