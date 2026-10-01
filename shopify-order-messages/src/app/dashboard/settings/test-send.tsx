'use client';

import { useState, useTransition } from 'react';
import { sendTest } from '../actions';

export function TestSend({ templates }: { templates: { key: string; label: string }[] }) {
  const [phone, setPhone] = useState('');
  const [key, setKey] = useState(templates[0]?.key ?? '');
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setResult(null);
        start(async () => setResult(await sendTest(phone, key)));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mobile number</span>
          <input
            id="test-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="98765 43210"
            required
            className="h-12 w-full rounded-lg border border-ink-20 bg-white px-4 text-base hover:border-ink-40 focus:border-ink focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Message</span>
          <select
            id="test-template"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="h-12 w-full rounded-lg border border-ink-20 bg-white px-3 text-base hover:border-ink-40 focus:border-ink focus:outline-none"
          >
            {templates.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-12 self-end rounded-lg bg-red px-6 font-semibold text-white transition-colors hover:bg-maroon disabled:opacity-60"
        >
          {pending ? 'Sending' : 'Send test'}
        </button>
      </div>
      {result && (
        <p
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${result.ok ? 'border border-ink-10 bg-white text-ink' : 'bg-red-10 text-maroon'}`}
        >
          {result.message}
        </p>
      )}
      <p className="text-xs text-ink-60">
        Uses sample values (customer &quot;Ravi&quot;, order #1042). Ignores the opt-in rule and switches, but never messages
        someone who replied STOP. Shows up in Order Timeline under order TEST.
      </p>
    </form>
  );
}
