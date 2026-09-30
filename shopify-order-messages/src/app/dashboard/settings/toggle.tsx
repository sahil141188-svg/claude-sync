'use client';

import { useState, useTransition } from 'react';

/** Large on/off switch that saves immediately. */
export function Toggle({
  label,
  description,
  initial,
  onSave,
}: {
  label: string;
  description?: string;
  initial: boolean;
  onSave: (value: boolean) => Promise<{ ok: boolean }>;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  function flip() {
    const next = !on;
    setOn(next);
    setError(false);
    start(async () => {
      const res = await onSave(next);
      if (!res.ok) {
        setOn(!next);
        setError(true);
      }
    });
  }

  return (
    <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-ink-60">{description}</p>}
        {error && <p className="text-sm text-red">Could not save. Try again.</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={pending}
        onClick={flip}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          on ? 'bg-red hover:bg-maroon' : 'bg-ink-20 hover:bg-ink-40'
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white ${on ? 'left-7' : 'left-1'}`}
          aria-hidden
        />
      </button>
    </div>
  );
}
